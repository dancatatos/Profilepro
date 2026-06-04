/**
 * Regenerate a single headline or bio variant with user feedback.
 *
 * The variant picker shows the user 3 options after profile generation;
 * if none feel right they type a short instruction ("shorter", "more
 * recruiting-focused", "remove the word 'mentor'") and we rewrite ONE
 * field using the current variant + feedback as additional context.
 *
 * Why this exists (vs. just calling the generic rewrite action):
 *   - Keeps the prompt purpose-built — a regenerated headline should
 *     still be a single tight line, not drift toward bio length.
 *   - Counted against the user's daily AI quota like a normal
 *     generation, so feedback loops can't be abused for free calls.
 */

import { NextResponse } from "next/server";
import { rewriteFlow } from "@/lib/ai/flows";
import { getLastUsage } from "@/lib/ai/client";
import { checkAIQuota, logAICall } from "@/lib/ai/guard";
import type { AICopyMode, AILanguage } from "@/types";

export const dynamic = "force-dynamic";

interface RequestBody {
  field?: "headline" | "bio";
  current?: string;
  feedback?: string;
  mode?: AICopyMode;
  language?: AILanguage;
  uid?: string;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const field = body.field === "bio" ? "bio" : "headline";
  const current = (body.current || "").trim();
  const feedback = (body.feedback || "").trim();
  if (!feedback) {
    return NextResponse.json(
      { error: "Tell me what to change — feedback is required." },
      { status: 400 },
    );
  }

  const gate = await checkAIQuota(body.uid);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const instruction =
    field === "headline"
      ? `Rewrite this credibility-profile headline based on the user's feedback below. Keep it ONE concise, single-line hook — never a paragraph. Match the original's identity (who they help, what result) unless the feedback explicitly says to change it. Return ONLY the headline text — no quotes, no explanation, no "Here is:".

USER FEEDBACK: ${feedback}`
      : `Rewrite this credibility-profile bio based on the user's feedback below. Keep it 2-3 short sentences, mobile-readable, trust-building. Match the original's identity unless the feedback explicitly says to change it. Return ONLY the bio text — no preamble, no quotes.

USER FEEDBACK: ${feedback}`;

  const result = await rewriteFlow(
    instruction,
    current,
    body.mode ?? "professional",
    body.language ?? "english",
  );

  if (result.usedAI) {
    await logAICall(body.uid, "rewrite-section", getLastUsage()?.totalTokenCount);
  }

  /* Strip stray quotes / markdown the model sometimes wraps around
     single-field output. Keep it to the first line for headlines. */
  let variant = result.data.trim().replace(/^["']+|["']+$/g, "").trim();
  if (field === "headline") {
    variant = variant.split("\n")[0].trim();
  }

  if (!variant) {
    return NextResponse.json(
      { error: "AI returned no usable text. Please try different feedback." },
      { status: 502 },
    );
  }

  return NextResponse.json({ variant, usedAI: result.usedAI });
}
