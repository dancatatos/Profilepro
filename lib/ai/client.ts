/* ============================================================
   Gemini transport layer.
   Talks to the Gemini REST API directly (no SDK dependency) so it
   runs identically in Next.js route handlers and Cloud Functions.
   Swap this single file for the Firebase AI Logic SDK later
   without touching prompts / flows / actions.
   ============================================================ */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/* Pinned default — kept in sync with .env.example. If the env var
   fails to load (Vercel preview, missing secret, etc.) we still land
   on the current production model rather than silently downgrading
   to an older one. */
const DEFAULT_MODEL = "gemini-2.5-flash";

function modelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}
function apiKey(): string {
  return process.env.GEMINI_API_KEY || "";
}

/* Safety overrides. Gemini's defaults block "MEDIUM" and above on
   four harm categories; for legitimate marketing copy (esp. recruiting
   + income-related language) that produces silent empty outputs. We
   relax to BLOCK_ONLY_HIGH so only actually harmful content is
   blocked, while regular sales / opportunity copy passes through.
   The model still refuses anything genuinely abusive. */
const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
];

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
interface GeminiUsage {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
  usageMetadata?: GeminiUsage;
}

/**
 * Most recent call's token usage. Set after each successful geminiText
 * call (and therefore each geminiJSON call too). Read by the quota
 * helpers in `lib/ai/usage.ts` after a generation to record cost.
 * Single global slot is intentional — we only ever care about the
 * immediately-preceding call from the same request, and serialising
 * within a Next.js route handler request means there's no race.
 */
let lastUsage: GeminiUsage | null = null;
export function getLastUsage(): GeminiUsage | null {
  return lastUsage;
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
    safetySettings: SAFETY_SETTINGS,
  };
}

/* Retry policy: one transient blip shouldn't bounce the user to the
   mock fallback. We retry on 429 (rate limit) and 5xx with exponential
   backoff (250ms → 750ms). 4xx other than 429 are caller errors and
   are NOT retried — re-trying a bad prompt just wastes quota. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 2;

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return res;
      if (!RETRYABLE_STATUSES.has(res.status) || attempt === MAX_RETRIES) {
        return res;
      }
      lastErr = new Error(`Gemini ${res.status}`);
    } catch (err) {
      lastErr = err;
      if (attempt === MAX_RETRIES) throw err;
    }
    /* Exponential backoff: 250ms, 750ms — kept short so the user
       doesn't notice a multi-second delay before falling to the mock. */
    await new Promise((r) => setTimeout(r, 250 * (3 ** attempt)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini retry exhausted");
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
    const res = await fetchWithRetry(
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
    const data = (await res.json()) as GeminiResponse;
    lastUsage = data.usageMetadata ?? null;
    return extractText(data);
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
