import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/ai/llm", () => ({
  embedTexts: async () => {
    throw new Error("llm disabled in tests");
  },
  toPgVector: () => "[]",
}));

import { buildChatEvidence, INSUFFICIENT } from "../src/ai/rag";

describe("AI retrieval", () => {
  const db = {
    $queryRawUnsafe: async () => [],
    codeFile: { findMany: async () => [] },
    dependency: { findMany: async () => [] },
    symbol: { findMany: async () => [] },
    documentSummary: { findMany: async () => [] },
    repository: { findUnique: async () => null },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a stable insufficient-evidence sentence", () => {
    expect(INSUFFICIENT).toMatch(/enough evidence/i);
  });

  it("marks retrieval as insufficient when the repository has no indexed evidence", async () => {
    const evidence = await buildChatEvidence(db as never, "repo-1", "How does authentication work?");
    expect(evidence.sufficient).toBe(false);
  });
});
