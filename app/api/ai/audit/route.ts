import { NextRequest, NextResponse } from "next/server";
import { auditProfileFlow } from "@/lib/ai/flows";
import { getLastUsage } from "@/lib/ai/client";
import { checkAIQuota, logAICall } from "@/lib/ai/guard";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { profile?: Profile; uid?: string };
    if (!body.profile) {
      return NextResponse.json({ error: "Missing profile" }, { status: 400 });
    }
    const gate = await checkAIQuota(body.uid);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }
    const result = await auditProfileFlow(body.profile);
    if (result.usedAI) {
      await logAICall(body.uid, "audit-profile", getLastUsage()?.totalTokenCount);
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI audit failed" },
      { status: 500 },
    );
  }
}
