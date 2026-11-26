/**
 * Text embeddings for product search. Shared by the app (via lib/ai.ts) and scripts/, so no "server-only" here.
 * EMBEDDING_PROVIDER = gemini (default, free tier) | openai. Both return 1536 dimensions to match products.embedding.
 * Switching provider or model means re-running scripts/embed-products.ts, because vectors from different models don't mix.
 */
import OpenAI from "openai";

export type EmbedTask = "document" | "query";

const DIMENSIONS = 1536;
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function embeddingProvider() {
  return (process.env.EMBEDDING_PROVIDER || "gemini").toLowerCase();
}

async function embedGemini(texts: string[], task: EmbedTask): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing from .env");
  const model = process.env.AI_EMBEDDING_MODEL || "gemini-embedding-001";
  const out: number[][] = [];
  // The batch endpoint takes up to 100 texts per request.
  for (let i = 0; i < texts.length; i += 100) {
    const chunk = texts.slice(i, i + 100);
    const res = await fetch(`${GEMINI_BASE}/models/${model}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        requests: chunk.map((text) => ({
          model: `models/${model}`,
          content: { parts: [{ text }] },
          taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
          outputDimensionality: DIMENSIONS,
        })),
      }),
    });
    if (!res.ok) throw new Error(`Gemini embeddings failed (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as { embeddings: { values: number[] }[] };
    out.push(...json.embeddings.map((e) => e.values));
  }
  return out;
}

async function embedOpenAI(texts: string[]): Promise<number[][]> {
  const res = await new OpenAI().embeddings.create({
    model: process.env.AI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: texts,
  });
  return res.data.map((d) => d.embedding);
}

export async function embed(texts: string[], task: EmbedTask = "query"): Promise<number[][]> {
  return embeddingProvider() === "openai" ? embedOpenAI(texts) : embedGemini(texts, task);
}
