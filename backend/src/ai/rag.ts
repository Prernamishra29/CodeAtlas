/**
 * RAG storage: PostgreSQL + pgvector.
 *
 * Chosen over a dedicated vector DB because analysis metadata, symbols,
 * dependencies and embeddings already live in the same Postgres instance.
 * Retrieval can join chunks to CodeFile/Symbol/Dependency without another network hop,
 * and local Docker already runs pgvector. Embedding size is 1536 to match the schema.
 */
import type { PrismaClient } from "@prisma/client";
import { embedTexts, toPgVector } from "./llm";

type Db = PrismaClient;

export interface RankedChunk {
  content: string;
  sourceId: string;
  sourceType: string;
  score: number;
}

export interface ChatEvidence {
  context: string;
  citations: string[];
  sufficient: boolean;
}

const INSUFFICIENT =
  "I couldn't find enough evidence in the analyzed repository to answer this confidently.";

function terms(question: string) {
  return question
    .toLowerCase()
    .split(/[^a-z0-9_./-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3 && !STOP.has(item));
}

const STOP = new Set([
  "the",
  "and",
  "for",
  "how",
  "does",
  "what",
  "where",
  "this",
  "that",
  "with",
  "from",
  "work",
  "working",
]);

function boost(text: string, words: string[]) {
  const hay = text.toLowerCase();
  return words.reduce((sum, word) => sum + (hay.includes(word) ? 0.25 : 0), 0);
}

export async function retrieveChunks(db: Db, repositoryId: string, question: string): Promise<RankedChunk[]> {
  const words = terms(question);
  try {
    const [vector] = await embedTexts([question]);
    const vectorString = toPgVector(vector);
    const rows = await db.$queryRawUnsafe<
      { content: string; sourceId: string; sourceType: string; distance: number }[]
    >(
      `
      SELECT content, "sourceId", "sourceType", (embedding <=> $2::vector)::float AS distance
      FROM "DocumentChunk"
      WHERE "repositoryId" = $1 AND embedding IS NOT NULL
      ORDER BY embedding <=> $2::vector
      LIMIT 16
    `,
      repositoryId,
      vectorString,
    );
    return rows
      .map((row) => ({
        content: row.content,
        sourceId: row.sourceId,
        sourceType: row.sourceType,
        score: 1 / (1 + Number(row.distance || 0)) + boost(`${row.sourceId} ${row.content}`, words),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  } catch (error) {
    console.warn("Vector retrieval failed.", error);
    return [];
  }
}

export async function buildChatEvidence(db: Db, repositoryId: string, question: string): Promise<ChatEvidence> {
  const words = terms(question);
  const chunks = await retrieveChunks(db, repositoryId, question);
  const cited = new Set<string>();

  const filePaths = chunks
    .filter((chunk) => chunk.sourceType === "code" || chunk.sourceId.includes("/"))
    .map((chunk) => chunk.sourceId)
    .filter((path) => path.includes(".") || path.includes("/"));

  const keywordFiles = words.length
    ? await db.codeFile.findMany({
        where: {
          repositoryId,
          OR: [
            { path: { contains: words[0], mode: "insensitive" } },
            ...words.slice(0, 4).map((word) => ({
              symbols: { some: { name: { contains: word, mode: "insensitive" as const } } },
            })),
          ],
        },
        take: 6,
        select: {
          path: true,
          language: true,
          content: true,
          complexity: true,
          symbols: { take: 12, select: { name: true, type: true, line: true } },
        },
      })
    : [];

  const paths = [...new Set([...filePaths, ...keywordFiles.map((file) => file.path)])].slice(0, 8);
  const files = await db.codeFile.findMany({
    where: { repositoryId, path: { in: paths } },
    select: {
      id: true,
      path: true,
      language: true,
      content: true,
      symbols: { take: 16, select: { name: true, type: true, line: true } },
    },
  });
  const fileIds = files.map((file) => file.id);

  const deps = fileIds.length
    ? await db.dependency.findMany({
        where: {
          repositoryId,
          OR: [{ sourceId: { in: fileIds } }, { targetId: { in: fileIds } }],
        },
        take: 40,
        include: { source: { select: { path: true } }, target: { select: { path: true } } },
      })
    : [];

  const symbols = words.length
    ? await db.symbol.findMany({
        where: {
          file: { repositoryId },
          OR: words.slice(0, 5).map((word) => ({ name: { contains: word, mode: "insensitive" } })),
        },
        take: 20,
        include: { file: { select: { path: true } } },
      })
    : [];

  const summaries = await db.documentSummary.findMany({
    where: { repositoryId },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  const repo = await db.repository.findUnique({
    where: { id: repositoryId },
    select: { owner: true, name: true, defaultBranch: true, description: true },
  });

  const parts: string[] = [];
  if (repo) {
    parts.push(
      `## Repository metadata\n${repo.owner}/${repo.name} (${repo.defaultBranch})\n${repo.description ?? ""}`.trim(),
    );
  }

  if (summaries.length) {
    parts.push(
      "## Existing documentation\n" +
        summaries
          .map((item) => `### ${item.entityType}${item.entityId ? ` · ${item.entityId}` : ""}\n${item.content}`)
          .join("\n\n"),
    );
  }

  if (chunks.length) {
    parts.push(
      "## Retrieved chunks\n" +
        chunks.map((chunk) => `Source [${chunk.sourceId}]:\n${chunk.content}`).join("\n\n"),
    );
    for (const chunk of chunks) {
      if (chunk.sourceType === "code") cited.add(chunk.sourceId);
    }
  }

  if (files.length) {
    parts.push(
      "## Relevant source code\n" +
        files
          .map((file) => {
            cited.add(file.path);
            const symbolList = file.symbols.map((symbol) => `${symbol.type} ${symbol.name}:${symbol.line}`).join(", ");
            return `### ${file.path} (${file.language})\nSymbols: ${symbolList || "none"}\n\`\`\`\n${(file.content ?? "").slice(0, 2200)}\n\`\`\``;
          })
          .join("\n\n"),
    );
  }

  if (symbols.length) {
    parts.push(
      "## Parsed symbols\n" +
        symbols
          .map((symbol) => {
            cited.add(symbol.file.path);
            return `${symbol.type} ${symbol.name} in ${symbol.file.path}:${symbol.line}`;
          })
          .join("\n"),
    );
  }

  if (deps.length) {
    parts.push(
      "## Dependencies\n" +
        deps
          .map((dep) => {
            cited.add(dep.source.path);
            if (dep.target?.path) cited.add(dep.target.path);
            return `${dep.source.path} -> ${dep.target?.path ?? dep.targetPath} (${dep.type})`;
          })
          .join("\n"),
    );
  }

  const sufficient =
    chunks.length + files.length + symbols.length >= 1 ||
    summaries.some((item) => item.entityType === "repository" || item.entityType === "architecture");

  return {
    context: parts.join("\n\n").slice(0, 22_000),
    citations: [...cited].slice(0, 12),
    sufficient,
  };
}

export { INSUFFICIENT };
