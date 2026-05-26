/**
 * Follow-up message generator.
 *
 * Given a lead's current pipeline stage and the user's niche/tone,
 * returns 3 short personalised message variants the user can copy
 * and paste into Messenger / Viber / WhatsApp / SMS.
 *
 * Designed for Filipino network marketers — supports Taglish output,
 * keeps the tone relationship-focused (no spam-y "Buy now!"), and
 * always uses the lead's first name to feel personal.
 *
 * Cost note: each call is ~750 tokens in, ~250 out → roughly ₱0.008
 * per call on Gemini 2.5 Flash. See the cost analysis in the previous
 * planning thread for scale projections.
 */

import { NextResponse } from "next/server";
import { geminiJSON, isAIConfigured } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

interface RequestBody {
  /** Lead's full name — we'll use the first name only in the messages. */
  leadName?: string;
  /** Current pipeline stage name (e.g. "Watched intro"). */
  stageName?: string;
  /** Optional per-stage AI context from the template (gives the model
   *  the stage's narrative — "they just watched the intro video"). */
  stageContext?: string;
  /** User's niche / industry (from their profile onboarding). */
  niche?: string;
  /** What the user offers (from profile). */
  offer?: string;
  /** "english" or "taglish" — defaults to english. */
  language?: "english" | "taglish";
  /** Conversational tone (e.g. "friendly", "professional", "recruiting"). */
  tone?: string;
}

interface MessageVariants {
  variants: string[];
}

/** OpenAPI-ish schema we ask Gemini to fill in. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      items: { type: "string" },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ["variants"],
};

function firstName(full: string): string {
  return full.split(/\s+/)[0] || "there";
}

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI is not configured. Add GEMINI_API_KEY in Vercel env vars." },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const leadName = (body.leadName || "").trim();
  const stage = (body.stageName || "follow-up").trim();
  const stageContext = (body.stageContext || "").trim();
  const niche = (body.niche || "").trim();
  const offer = (body.offer || "").trim();
  const language = body.language === "taglish" ? "taglish" : "english";
  const tone = (body.tone || "friendly").trim();

  if (!leadName) {
    return NextResponse.json(
      { error: "leadName is required." },
      { status: 400 },
    );
  }

  const name = firstName(leadName);

  /* System prompt — sets the model's role + hard constraints. The
     audience-specific notes here are tuned for PH MLM/recruiting
     style: relationship-first, conversational, never spammy. */
  const system = `You are an expert follow-up coach for Filipino network marketers, recruiters, and coaches.

You write SHORT chat messages (2-4 sentences max) that:
- Sound like a real person, not a marketer
- Use the lead's first name once, casually
- End with an open question or soft CTA — never "Buy now!" or aggressive sales
- Match the lead's stage in the follow-up pipeline
- Use casual, warm tone — emojis sparingly (1-2 max, not every sentence)
- Are mobile-friendly (no walls of text)

NEVER:
- Use the word "synergy", "leverage", "ROI" or other corporate jargon
- Start with "I hope this finds you well" or similar formal greetings
- Make promises about specific income amounts
- Pressure the lead — they always have the right to say no`;

  const languageNote =
    language === "taglish"
      ? "Write in natural Taglish (mix Filipino + English the way Filipinos actually chat). Use 'po' when appropriate for respect. Casual particles like 'kasi', 'naman', 'lang' are encouraged."
      : "Write in conversational English (not formal business English).";

  const prompt = `Generate 3 different follow-up message variants for this lead. Each variant should take a slightly different angle so the user can pick the one that fits their voice.

LEAD CONTEXT:
- First name: ${name}
- Current stage: ${stage}
${stageContext ? `- Stage context: ${stageContext}` : ""}

USER (THE SENDER) CONTEXT:
${niche ? `- Niche / industry: ${niche}` : "- Niche: not specified — keep it generic"}
${offer ? `- What they offer: ${offer}` : ""}
- Desired tone: ${tone}

LANGUAGE: ${languageNote}

Return exactly 3 distinct variants. Each variant should:
1. Open with ${name}'s name casually
2. Reference the stage context (if provided) to feel relevant
3. End with a soft open question or invitation
4. Be 2-4 sentences

Make the 3 variants feel meaningfully different — different angles, openers, or framings — not just rewordings of the same message.`;

  try {
    const result = await geminiJSON<MessageVariants>({
      system,
      prompt,
      temperature: 0.9,
      schema: RESPONSE_SCHEMA,
      maxOutputTokens: 800,
    });

    /* Sanity check — at minimum 1 variant, max 3. Some odd model outputs
       have returned 4+ when temperature is high; trim defensively. */
    const variants = Array.isArray(result.variants)
      ? result.variants
          .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
          .slice(0, 3)
      : [];
    if (variants.length === 0) {
      return NextResponse.json(
        { error: "AI returned no usable variants. Please retry." },
        { status: 502 },
      );
    }
    return NextResponse.json({ variants });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 },
    );
  }
}
