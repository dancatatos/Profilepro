import { NextRequest, NextResponse } from "next/server";
import { cloneRewriteFlow } from "@/lib/ai/flows";
import type { AICopyMode, AILanguage, Profile } from "@/types";

export const dynamic = "force-dynamic";

interface CloneBody {
  profile?: Profile;
  newName?: string;
  mode?: AICopyMode;
  language?: AILanguage;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CloneBody;
    if (!body.profile || !body.newName) {
      return NextResponse.json(
        { error: "Missing profile or newName" },
        { status: 400 },
      );
    }
    const result = await cloneRewriteFlow(
      body.profile,
      body.newName,
      body.mode ?? "professional",
      body.language ?? "english",
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI clone failed" },
      { status: 500 },
    );
  }
}
