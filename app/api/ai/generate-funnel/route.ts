import { NextRequest, NextResponse } from "next/server";
import { generateFunnelFlow } from "@/lib/ai/flows";
import { getLastUsage } from "@/lib/ai/client";
import { checkAIQuota, logAICall } from "@/lib/ai/guard";
import type { AIFunnelAnswers } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      answers?: AIFunnelAnswers;
      uid?: string;
    };
    if (!body.answers) {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }
    const gate = await checkAIQuota(body.uid);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const result = await generateFunnelFlow(body.answers);
    if (result.usedAI) {
      await logAICall(body.uid, "generate-headline", getLastUsage()?.totalTokenCount);
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 },
    );
  }
}
