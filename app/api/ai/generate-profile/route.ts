import { NextRequest, NextResponse } from "next/server";
import { generateProfileFlow } from "@/lib/ai/flows";
import type { AIOnboardingAnswers } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { answers } = (await req.json()) as { answers?: AIOnboardingAnswers };
    if (!answers) {
      return NextResponse.json({ error: "Missing answers" }, { status: 400 });
    }
    const result = await generateProfileFlow(answers);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI generation failed" },
      { status: 500 },
    );
  }
}
