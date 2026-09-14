import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { chatModel, complete, embedTexts, hasLlmKey, toPgVector } from "../ai/llm";

const prisma = new PrismaClient();

const SKIP = /(^|\/)(dist|build|coverage|\.git|node_modules)\//i;
const SKIP_FILE = /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|\.min\.(js|css)|\.map$|\.svg$)/i;

export async function generateAiDocumentation(repositoryId: string): Promise<boolean> {
  if (!hasLlmKey()) {
    console.log("No GEMINI_API_KEY or OPENAI_API_KEY, skipping AI documentation generation.");
    return false;
  }

  await prisma.documentChunk.deleteMany({ where: { repositoryId } });
  await prisma.documentSummary.deleteMany({ where: { repositoryId } });

  const model = chatModel();
  const repo = await prisma.repository.findUnique({ where: { id: repositoryId } });
  const files = (await prisma.codeFile.findMany({
    where: { repositoryId },
    include: { symbols: { take: 20 } },
    orderBy: { complexity: "desc" },
  })).filter((file) => !SKIP.test(file.path) && !SKIP_FILE.test(file.path));

  const deps = await prisma.dependency.findMany({
    where: { repositoryId },
    take: 80,
    include: { source: { select: { path: true } }, target: { select: { path: true } } },
  });

  const languages = countBy(files.map((file) => file.language));
  const folders = groupFolders(files.map((file) => file.path));
  const readme = files.find((file) => /^readme(\.md)?$/i.test(file.path.split("/").pop() ?? ""));
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 700, chunkOverlap: 80 });

  const metadata = [
    `Repository: ${repo?.owner}/${repo?.name}`,
    `Branch: ${repo?.defaultBranch}`,
    `Files: ${files.length}`,
    `Languages: ${Object.entries(languages)
      .map(([name, count]) => `${name} (${count})`)
      .join(", ")}`,
    `Top folders: ${Object.keys(folders).slice(0, 12).join(", ")}`,
  ].join("\n");

  const symbolSketch = files
    .slice(0, 25)
    .flatMap((file) => file.symbols.slice(0, 6).map((symbol) => `${symbol.type} ${symbol.name} · ${file.path}:${symbol.line}`))
    .slice(0, 80)
    .join("\n");

  const depSketch = deps
    .slice(0, 50)
    .map((dep) => `${dep.source.path} -> ${dep.target?.path ?? dep.targetPath}`)
    .join("\n");

  console.log("Generating repository summary...");
  await saveSummary(
    repositoryId,
    "repository",
    null,
    model,
    await complete(
      `Write a repository summary for engineers new to this codebase. Use only this evidence.\n\n${metadata}\n\nREADME:\n${(readme?.content ?? "").slice(0, 4000)}\n\nKey symbols:\n${symbolSketch}\n\nDependencies:\n${depSketch}`,
    ),
  );

  console.log("Generating architecture summary...");
  await saveSummary(
    repositoryId,
    "architecture",
    null,
    model,
    await complete(
      `Write an architecture summary: layers, entry points, and how folders relate. Use only this evidence.\n\n${metadata}\n\nFolders:\n${Object.entries(folders)
        .slice(0, 15)
        .map(([folder, paths]) => `${folder}/ (${paths.length} files)`)
        .join("\n")}\n\nImport graph (sample):\n${depSketch}`,
    ),
  );

  const folderNames = Object.entries(folders)
    .filter(([, paths]) => paths.length >= 2)
    .slice(0, 5);
  for (const [folder, paths] of folderNames) {
    const sample = files.filter((file) => paths.includes(file.path)).slice(0, 8);
    console.log("Generating folder summary", folder);
    try {
      await saveSummary(
        repositoryId,
        "folder",
        folder,
        model,
        await complete(
          `Summarize the "${folder}" folder. What belongs here and how is it used?\n\nFiles:\n${sample
            .map((file) => `${file.path} (${file.language}, complexity ${file.complexity})\nSymbols: ${file.symbols.map((s) => s.name).join(", ")}`)
            .join("\n\n")}`,
        ),
      );
    } catch (error) {
      console.error("folder summary failed", folder, error);
    }
  }

  const important = pickImportant(files, deps).slice(0, 6);
  for (const file of important) {
    console.log("Generating module summary", file.path);
    const fileDeps = deps.filter((dep) => dep.source.path === file.path || dep.target?.path === file.path);
    await saveSummary(
      repositoryId,
      "module",
      file.path,
      model,
      await complete(
        `Summarize this important module for an engineer.\n\nFile: ${file.path}\nLanguage: ${file.language}\nComplexity: ${file.complexity}\nSymbols: ${file.symbols.map((s) => `${s.type} ${s.name}:${s.line}`).join(", ")}\nDependencies: ${fileDeps
          .map((dep) => `${dep.source.path} -> ${dep.target?.path ?? dep.targetPath}`)
          .join("; ")}\n\nSource:\n${(file.content ?? "").slice(0, 5000)}`,
      ),
    );
  }

  const extraFiles = files
    .filter((file) => file.content && file.complexity > 0 && !important.some((item) => item.id === file.id))
    .slice(0, 6);
  for (const file of extraFiles) {
    console.log("Generating file summary", file.path);
    await saveSummary(
      repositoryId,
      "file",
      file.path,
      model,
      await complete(
        `Write a short file summary (what it does, key functions/classes). Use only this source.\n\n${file.path}\nSymbols: ${file.symbols.map((s) => `${s.type} ${s.name}`).join(", ")}\n\n${(file.content ?? "").slice(0, 4500)}`,
      ),
    );
  }

  const summaries = await prisma.documentSummary.findMany({ where: { repositoryId } });
  for (const summary of summaries) {
    await chunkAndEmbed(repositoryId, summary.content, "summary", summary.entityId ?? summary.entityType, splitter);
  }

  const embedFiles = [...important, ...extraFiles, ...files.filter((file) => /readme/i.test(file.path))].filter(
    (file, index, all) => all.findIndex((item) => item.id === file.id) === index,
  );
  for (const file of embedFiles) {
    const body = `File: ${file.path}\nLanguage: ${file.language}\n${(file.content ?? "").slice(0, 8000)}`;
    await chunkAndEmbed(repositoryId, body, "code", file.path, splitter);
  }

  console.log("AI documentation generation completed.");
  return true;
}

async function saveSummary(
  repositoryId: string,
  entityType: string,
  entityId: string | null,
  model: string,
  content: string,
) {
  if (!content.trim()) return;
  await prisma.documentSummary.create({
    data: { repositoryId, entityType, entityId, content, model },
  });
}

async function chunkAndEmbed(
  repositoryId: string,
  content: string,
  sourceType: string,
  sourceId: string,
  splitter: RecursiveCharacterTextSplitter,
) {
  if (!content.trim()) return;
  const chunks = await splitter.createDocuments([content]);
  for (const chunk of chunks) {
    const text = chunk.pageContent;
    const [vector] = await embedTexts([text]);
    const vectorString = toPgVector(vector);
    await prisma.$executeRaw`
      INSERT INTO "DocumentChunk" ("id", "repositoryId", "sourceType", "sourceId", "content", "embedding", "createdAt")
      VALUES (gen_random_uuid(), ${repositoryId}, ${sourceType}, ${sourceId}, ${text}, ${vectorString}::vector, now())
    `;
  }
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function groupFolders(paths: string[]) {
  const groups: Record<string, string[]> = {};
  for (const path of paths) {
    const folder = path.includes("/") ? path.split("/").slice(0, path.split("/").length > 2 ? 2 : 1).join("/") : "(root)";
    groups[folder] ??= [];
    groups[folder].push(path);
  }
  return Object.fromEntries(Object.entries(groups).sort((a, b) => b[1].length - a[1].length));
}

function pickImportant<T extends { id: string; path: string; complexity: number }>(
  files: T[],
  deps: { source: { path: string }; target: { path: string } | null }[],
) {
  const fan = new Map<string, number>();
  for (const dep of deps) {
    fan.set(dep.source.path, (fan.get(dep.source.path) ?? 0) + 1);
    if (dep.target?.path) fan.set(dep.target.path, (fan.get(dep.target.path) ?? 0) + 1);
  }
  return [...files].sort((a, b) => b.complexity + (fan.get(b.path) ?? 0) * 2 - (a.complexity + (fan.get(a.path) ?? 0) * 2));
}
