import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ZodType } from "zod";
export { embed } from "./embeddings";

/**
 * Provider switch for the vision model, chosen by AI_PROVIDER (gemini | anthropic | openai).
 * The prototype defaults to Gemini's free tier; moving to Claude in production is one setting.
 * Embeddings live in lib/embeddings.ts (EMBEDDING_PROVIDER), because Anthropic has no embeddings API.
 */

export type ImageInput = { mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;
const getAnthropic = () => (anthropic ??= new Anthropic());
const getOpenAI = () => (openai ??= new OpenAI());

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

async function callAnthropic(system: string, prompt: string, images: ImageInput[]): Promise<string> {
  const response = await getAnthropic().messages.create({
    model: process.env.AI_VISION_MODEL || "claude-opus-5-5",
    max_tokens: 16000,
    system,
    output_config: { effort: "medium" },
    messages: [
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image" as const,
            source: { type: "base64" as const, media_type: img.mediaType, data: img.base64 },
          })),
          { type: "text" as const, text: prompt },
        ],
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined this request");
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function callOpenAI(system: string, prompt: string, images: ImageInput[]): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: process.env.AI_VISION_MODEL!,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          ...images.map((img) => ({
            type: "image_url" as const,
            image_url: { url: `data:${img.mediaType};base64,${img.base64}` },
          })),
          { type: "text" as const, text: prompt },
        ],
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

/** The free tier rate-limits bursts (429) and is sometimes overloaded (503): wait and retry. */
async function fetchWithRetry(url: string, init: RequestInit, tries = 2): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
    if (![429, 500, 503].includes(res.status) || i >= tries - 1) return res;
    const body = await res.text();
    const hinted = Number(body.match(/"retryDelay":\s*"(\d+)s"/)?.[1]);
    await new Promise((r) => setTimeout(r, Math.min(hinted || 4 * 2 ** i, 30) * 1000));
  }
}

/** Main model first; if Google says it's overloaded, fall back to the next one so the customer still gets an answer. */
function geminiModels(): string[] {
  const main = process.env.AI_VISION_MODEL || "gemini-3.8-flash";
  const fallbacks = (process.env.AI_VISION_FALLBACK_MODELS ?? "gemini-3.5-flash,gemini-3-flash-preview,gemini-flash-lite-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([main, ...fallbacks])];
}

async function callGemini(system: string, prompt: string, images: ImageInput[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing from .env");
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [
          ...images.map((img) => ({ inline_data: { mime_type: img.mediaType, data: img.base64 } })),
          { text: prompt },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  let lastError = "";
  for (const model of geminiModels()) {
    let res: Response;
    try {
      res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body,
      });
    } catch (err) {
      lastError = `${model}: ${(err as Error).message}`;
      continue; // timeout or network error: try the next model
    }
    if ([404, 429, 500, 503].includes(res.status)) {
      lastError = `${model} (${res.status}): ${(await res.text()).slice(0, 300)}`;
      continue;
    }
    if (!res.ok) throw new Error(`Gemini request failed (${res.status}): ${await res.text()}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
    };
    if (json.promptFeedback?.blockReason) throw new Error(`The model declined this request (${json.promptFeedback.blockReason})`);
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    return parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
  }
  throw new Error(`Gemini unavailable: ${lastError}`);
}

/** Ask the vision model for JSON and validate it with zod. Retries once on a bad shape. */
export async function generateJson<T>(opts: {
  system: string;
  prompt: string;
  images?: ImageInput[];
  schema: ZodType<T>;
}): Promise<T> {
  const call = provider === "openai" ? callOpenAI : provider === "anthropic" ? callAnthropic : callGemini;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const prompt =
      attempt === 0 ? opts.prompt : `${opts.prompt}\n\nYour previous reply was not valid JSON for the schema. Return ONLY the JSON object.`;
    const text = await call(opts.system, prompt, opts.images ?? []);
    try {
      return opts.schema.parse(extractJson(text));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
