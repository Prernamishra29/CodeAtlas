import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CacheService } from "../cache/cache.module";
import { CacheTtl, cacheKeys } from "../cache/cache.keys";
import { parseBranch, parseGithubUrl } from "../common/github-url";
import { CreateRepositoryDto } from "./dto/create-repository.dto";

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(userId: string) {
    return this.cache.wrap(cacheKeys.repos(userId), CacheTtl.repoList, async () => {
      const rows = await this.prisma.repository.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: this.summaryInclude,
      });
      return Promise.all(rows.map((row) => this.toSummary(row)));
    });
  }

  async get(userId: string, id: string) {
    return this.cache.wrap(cacheKeys.repo(userId, id), CacheTtl.repoMeta, async () => {
      const repository = await this.prisma.repository.findFirst({
        where: { id, userId },
        include: this.summaryInclude,
      });
      if (!repository) throw new NotFoundException("Repository not found.");
      return this.toSummary(repository);
    });
  }

  async create(userId: string, dto: CreateRepositoryDto) {
    const parsed = parseGithubUrl(dto.url);
    const branch = parseBranch(dto.branch);
    const existing = await this.prisma.repository.findFirst({ where: { userId, url: parsed.url } });
    if (existing) throw new ConflictException("That repository is already in your workspace.");
    const created = await this.prisma.repository.create({
      data: {
        userId,
        url: parsed.url,
        owner: parsed.owner,
        name: parsed.name,
        defaultBranch: branch,
        description: "Imported repository — awaiting first analysis.",
      },
      include: this.summaryInclude,
    });
    await this.cache.invalidateUser(userId);
    return this.toSummary(created);
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.repository.delete({ where: { id } });
    await this.cache.invalidateUser(userId, id);
    return { id };
  }

  async getFiles(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.cache.wrap(cacheKeys.files(userId, id), CacheTtl.architecture, () =>
      this.prisma.codeFile.findMany({
        where: { repositoryId: id },
        include: { symbols: true },
        orderBy: { path: "asc" },
      }),
    );
  }

  async getDependencies(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.cache.wrap(cacheKeys.deps(userId, id), CacheTtl.architecture, () =>
      this.prisma.dependency.findMany({
        where: { repositoryId: id },
        include: { source: true, target: true },
      }),
    );
  }

  async getHealth(userId: string, id: string) {
    return this.cache.wrap(cacheKeys.health(userId, id), CacheTtl.health, async () => {
      const summary = await this.get(userId, id);
      const files = await this.prisma.codeFile.findMany({
        where: { repositoryId: id },
        orderBy: { complexity: "desc" },
      });
      const docs = await this.prisma.documentSummary.count({ where: { repositoryId: id } });
      const deps = await this.prisma.dependency.count({ where: { repositoryId: id } });
      const breakdown = this.scoreBreakdown(files.length, files, deps, docs);
      const analyses = await this.prisma.analysis.findMany({
        where: { repositoryId: id, status: "completed" },
        orderBy: { completedAt: "asc" },
        take: 8,
      });
      const trend =
        analyses.length > 0
          ? analyses.map((item, index) => ({
              period: item.completedAt ? item.completedAt.toISOString().slice(0, 10) : `Run ${index + 1}`,
              score: summary.healthScore,
            }))
          : [{ period: "Now", score: summary.healthScore }];

      return {
        breakdown,
        trend,
        complexity: files.slice(0, 8).map((file) => ({
          module: file.path.split("/").pop() ?? file.path,
          complexity: file.complexity,
        })),
        overall: summary.healthScore,
      };
    });
  }

  async search(userId: string, id: string, query: string, kinds: string[] = []) {
    await this.assertOwned(userId, id);
    const q = query.trim();
    if (!q) return [];
    const want = (kind: string) => kinds.length === 0 || kinds.includes(kind);
    const results: {
      id: string;
      kind: "file" | "function" | "class" | "documentation";
      file: string;
      symbol: string;
      description: string;
      relevance: number;
      line: number;
    }[] = [];

    if (want("file")) {
      const files = await this.prisma.codeFile.findMany({
        where: { repositoryId: id, path: { contains: q, mode: "insensitive" } },
        take: 20,
      });
      for (const file of files) {
        results.push({
          id: `file-${file.id}`,
          kind: "file",
          file: file.path,
          symbol: file.path.split("/").pop() ?? file.path,
          description: `${file.language} · ${file.lines} lines`,
          relevance: 0.9,
          line: 1,
        });
      }
    }

    if (want("function") || want("class")) {
      const types = [
        ...(want("function") ? ["function", "method", "call"] : []),
        ...(want("class") ? ["class", "interface", "type"] : []),
      ];
      const symbols = await this.prisma.symbol.findMany({
        where: {
          file: { repositoryId: id },
          name: { contains: q, mode: "insensitive" },
          type: { in: types },
        },
        include: { file: true },
        take: 30,
      });
      for (const symbol of symbols) {
        const kind = symbol.type === "class" || symbol.type === "interface" ? "class" : "function";
        results.push({
          id: symbol.id,
          kind,
          file: symbol.file.path,
          symbol: symbol.name,
          description: `${symbol.type} in ${symbol.file.path}`,
          relevance: 0.85,
          line: symbol.line,
        });
      }
    }

    if (want("documentation")) {
      const summaries = await this.prisma.documentSummary.findMany({
        where: {
          repositoryId: id,
          OR: [{ content: { contains: q, mode: "insensitive" } }, { entityType: { contains: q, mode: "insensitive" } }],
        },
        take: 10,
      });
      for (const summary of summaries) {
        results.push({
          id: summary.id,
          kind: "documentation",
          file: summary.entityId ?? "repository",
          symbol: summary.entityType,
          description: summary.content.slice(0, 220),
          relevance: 0.8,
          line: 1,
        });
      }
    }

    return results.slice(0, 40);
  }

  async getDocumentation(userId: string, id: string) {
    await this.assertOwned(userId, id);
    return this.cache.wrap(cacheKeys.docs(userId, id), CacheTtl.docs, () =>
      this.prisma.documentSummary.findMany({
        where: { repositoryId: id },
        orderBy: { createdAt: "asc" },
      }),
    );
  }

  async activity(userId: string) {
    const analyses = await this.prisma.analysis.findMany({
      where: { repository: { userId } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { repository: true },
    });
    return analyses.map((item) => ({
      id: item.id,
      repositoryId: item.repositoryId,
      repository: `${item.repository.owner}/${item.repository.name}`,
      kind: item.status === "failed" ? "failure" : item.status === "completed" ? "analysis" : "import",
      message:
        item.status === "completed"
          ? `Finished analyzing ${item.repository.name}`
          : item.status === "failed"
            ? `Analysis failed for ${item.repository.name}`
            : `${item.currentStep ?? item.status} · ${item.repository.name}`,
      at: (item.completedAt ?? item.createdAt).toISOString(),
    }));
  }

  async insights(userId: string, repositoryId?: string) {
    const repos = repositoryId
      ? [await this.assertOwned(userId, repositoryId)]
      : await this.prisma.repository.findMany({ where: { userId }, take: 8, orderBy: { updatedAt: "desc" } });

    const insights: { id: string; title: string; detail: string; severity: "info" | "warning" | "danger" | "success" }[] =
      [];

    for (const repo of repos) {
      if (repo.status === "not_analyzed") {
        insights.push({
          id: `${repo.id}-queued`,
          title: `${repo.name} has not been analyzed yet`,
          detail: "Run analysis to populate architecture, search, health and documentation.",
          severity: "info",
        });
        continue;
      }
      if (repo.status === "failed") {
        insights.push({
          id: `${repo.id}-failed`,
          title: `Last analysis of ${repo.name} failed`,
          detail: "Use Retry on the dashboard, the Repositories list, or the repository page.",
          severity: "danger",
        });
        continue;
      }
      const hot = await this.prisma.codeFile.findFirst({
        where: { repositoryId: repo.id },
        orderBy: { complexity: "desc" },
      });
      if (hot && hot.complexity > 12) {
        insights.push({
          id: `${repo.id}-complex`,
          title: `High complexity in ${hot.path.split("/").pop()}`,
          detail: `${repo.name} · cyclomatic complexity ${hot.complexity}.`,
          severity: "warning",
        });
      } else if (repo.status === "completed") {
        insights.push({
          id: `${repo.id}-ok`,
          title: `${repo.name} analysis is up to date`,
          detail: "Architecture, files and search are backed by the latest worker run.",
          severity: "success",
        });
      }
    }

    if (insights.length === 0) {
      insights.push({
        id: "empty",
        title: "Import a GitHub repository",
        detail: "Public repos work immediately. Private repos need a GitHub token in Settings.",
        severity: "info",
      });
    }
    return insights.slice(0, 8);
  }

  private summaryInclude = {
    results: { orderBy: { createdAt: "desc" as const }, take: 1 },
    _count: { select: { files: true, dependencies: true } },
  };

  private async assertOwned(userId: string, id: string) {
    const repository = await this.prisma.repository.findFirst({ where: { id, userId } });
    if (!repository) throw new NotFoundException("Repository not found.");
    return repository;
  }

  private async toSummary(row: {
    id: string;
    name: string;
    owner: string;
    url: string;
    defaultBranch: string;
    description: string | null;
    status: string;
    lastAnalyzedAt: Date | null;
    results: { totalFiles: number; totalLines: number; languages: unknown }[];
    _count: { files: number; dependencies: number };
  }) {
    const result = row.results[0];
    const languages = Array.isArray(result?.languages) ? (result.languages as { name?: string }[]) : [];
    const files = await this.prisma.codeFile.findMany({
      where: { repositoryId: row.id },
      select: { complexity: true, language: true },
    });
    const functions = await this.prisma.symbol.count({
      where: { file: { repositoryId: row.id }, type: { in: ["function", "method"] } },
    });
    const classes = await this.prisma.symbol.count({
      where: { file: { repositoryId: row.id }, type: { in: ["class", "interface"] } },
    });
    const docs = await this.prisma.documentSummary.count({ where: { repositoryId: row.id } });
    const breakdown = this.scoreBreakdown(files.length, files, row._count.dependencies, docs);

    const fileCount = result?.totalFiles ?? row._count.files;
    const placeholder = /awaiting first analysis/i.test(row.description ?? "");
    const description =
      row.status === "completed" && placeholder
        ? `Analyzed ${fileCount} files · ${(result?.totalLines ?? 0).toLocaleString()} lines`
        : (row.description ?? "");

    return {
      id: row.id,
      name: row.name,
      owner: row.owner,
      url: row.url,
      branch: row.defaultBranch,
      description,
      language: languages[0]?.name ?? files[0]?.language ?? "Unknown",
      status: row.status,
      healthScore: Math.round(
        (breakdown.architecture +
          breakdown.maintainability +
          breakdown.complexity +
          breakdown.dependencies +
          breakdown.documentation) /
          5,
      ),
      lastAnalyzedAt: row.lastAnalyzedAt,
      stats: {
        files: result?.totalFiles ?? row._count.files,
        linesOfCode: result?.totalLines ?? 0,
        languages: languages.length || new Set(files.map((file) => file.language)).size,
        dependencies: row._count.dependencies,
        functions,
        classes,
      },
    };
  }

  private scoreBreakdown(
    fileCount: number,
    files: { complexity: number }[],
    depCount: number,
    docCount: number,
  ) {
    if (fileCount === 0) {
      return { architecture: 0, maintainability: 0, complexity: 0, dependencies: 0, documentation: 0 };
    }
    const avgComplexity = files.reduce((sum, file) => sum + file.complexity, 0) / Math.max(files.length, 1);
    const complexity = Math.max(15, Math.min(100, Math.round(100 - avgComplexity * 3)));
    const maintainability = Math.max(20, Math.min(100, Math.round(90 - avgComplexity * 2)));
    const architecture = Math.max(25, Math.min(100, Math.round(40 + Math.min(depCount, 80) / 2)));
    const dependencies = Math.max(25, Math.min(100, Math.round(100 - Math.min(depCount, 80) * 0.4)));
    const documentation = docCount > 0 ? 82 : 28;
    return { architecture, maintainability, complexity, dependencies, documentation };
  }
}
