import OpenAI from "openai";
import { log } from "../common/logger";

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai/";
const VECTOR_DIM = 1536;

export function hasLlmKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
}

export function usesGemini() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function chatModel() {
  if (usesGemini()) return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.6-flash";
  return process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini";
}

export function embeddingModel() {
  if (usesGemini()) return process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";
  return "text-embedding-3-small";
}

export function createLlmClient() {
  if (usesGemini()) {
    return new OpenAI({
      apiKey: process.env.GEMINI_API_KEY!.trim(),
      baseURL: GEMINI_OPENAI_BASE,
    });
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/** Pad/truncate so Gemini's 768-d embeddings fit the existing vector(1536) column. */
export function toPgVector(values: number[], dim = VECTOR_DIM) {
  const out = values.slice(0, dim);
  while (out.length < dim) out.push(0);
  return `[${out.join(",")}]`;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = createLlmClient();
  const model = embeddingModel();
  const vectors: number[][] = [];
  for (const text of texts) {
    const started = Date.now();
    const response = await client.embeddings.create({
      model,
      input: text.slice(0, 8000),
      ...(usesGemini() ? { dimensions: VECTOR_DIM } : {}),
    });
    log("info", "ai.embed", {
      model,
      ms: Date.now() - started,
      promptTokens: response.usage?.prompt_tokens,
    });
    vectors.push(response.data[0]?.embedding ?? []);
  }
  return vectors;
}

export async function complete(prompt: string, system?: string) {
  const client = createLlmClient();
  const started = Date.now();
  const response = await client.chat.completions.create({
    model: chatModel(),
    messages: [
      {
        role: "system",
        content:
          system ??
          "You are a code intelligence writer for CodeAtlas. Use only the provided repository evidence. Never invent files, APIs, or behavior. If evidence is insufficient, say so clearly.",
      },
      { role: "user", content: prompt.slice(0, 24_000) },
    ],
  });
  log("info", "ai.complete", {
    model: chatModel(),
    ms: Date.now() - started,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
  });
  return response.choices[0]?.message.content?.trim() || "";
}
