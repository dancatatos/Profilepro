import { NextRequest, NextResponse } from "next/server";
import { generateFunnelFlow } from "@/lib/ai/flows";
import type { AIFunnelAnswers } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { answers } = (await req.json()) as { answers?: AIFunnelAnswers };
    if (!answers) {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }
    const result = await generateFunnelFlow(answers);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 },
    );
  }
}
