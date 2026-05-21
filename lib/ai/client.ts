/* ============================================================
   Gemini transport layer.
   Talks to the Gemini REST API directly (no SDK dependency) so it
   runs identically in Next.js route handlers and Cloud Functions.
   Swap this single file for the Firebase AI Logic SDK later
   without touching prompts / flows / actions.
   ============================================================ */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function modelName(): string {
  return process.env.GEMINI_MODEL || "gemini-2.0-flash";
}
function apiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

/** True when a real Gemini key is present (not a placeholder). */
export function isAIConfigured(): boolean {
  const k = apiKey();
  return !!k && !k.startsWith("YOUR_") && k.length > 12;
}

export interface GenerateOptions {
  system?: string;
  prompt: string;
  temperature?: number;
  /** Force a JSON response. */
  json?: boolean;
  /** Optional Gemini responseSchema (OpenAPI subset). */
  schema?: Record<string, unknown>;
  maxOutputTokens?: number;
}

interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function buildBody(opts: GenerateOptions) {
  const generationConfig: Record<string, unknown> = {
    temperature: opts.temperature ?? 0.8,
    maxOutputTokens: opts.maxOutputTokens ?? 2048,
  };
  if (opts.json) generationConfig.responseMimeType = "application/json";
  if (opts.schema) generationConfig.responseSchema = opts.schema;

  return {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    ...(opts.system
      ? { systemInstruction: { parts: [{ text: opts.system }] } }
      : {}),
    generationConfig,
  };
}

function extractText(data: GeminiResponse): string {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? ""
  );
}

/** Non-streaming text completion. */
export async function geminiText(opts: GenerateOptions): Promise<string> {
  if (!isAIConfigured()) {
    throw new AINotConfiguredError();
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(
      `${API_BASE}/${modelName()}:generateContent?key=${apiKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(opts)),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${detail.slice(0, 300)}`);
    }
    return extractText((await res.json()) as GeminiResponse);
  } finally {
    clearTimeout(timeout);
  }
}

/** JSON completion — parses the model output into a typed object. */
export async function geminiJSON<T>(opts: GenerateOptions): Promise<T> {
  const raw = await geminiText({ ...opts, json: true });
  return parseJSON<T>(raw);
}

/** Streaming completion — yields plain UTF-8 text chunks via SSE. */
export async function geminiStream(
  opts: GenerateOptions,
): Promise<ReadableStream<Uint8Array>> {
  if (!isAIConfigured()) throw new AINotConfiguredError();

  const res = await fetch(
    `${API_BASE}/${modelName()}:streamGenerateContent?alt=sse&key=${apiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(opts)),
    },
  );
  if (!res.ok || !res.body) {
    const detail = res.body ? await res.text() : "no body";
    throw new Error(`Gemini stream error ${res.status}: ${detail.slice(0, 200)}`);
  }

  const upstream = res.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await upstream.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const json = trimmed.slice(5).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const text = extractText(JSON.parse(json) as GeminiResponse);
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // partial / malformed chunk — skip
        }
      }
    },
    cancel() {
      upstream.cancel();
    },
  });
}

/** Tolerant JSON parser — strips markdown fences the model may add. */
export function parseJSON<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  const start = text.indexOf("{");
  const startArr = text.indexOf("[");
  const from =
    start === -1
      ? startArr
      : startArr === -1
        ? start
        : Math.min(start, startArr);
  if (from > 0) text = text.slice(from);
  return JSON.parse(text) as T;
}

/** Thrown when no Gemini key is configured — callers fall back to mocks. */
export class AINotConfiguredError extends Error {
  constructor() {
    super("Gemini API key not configured");
    this.name = "AINotConfiguredError";
  }
}
