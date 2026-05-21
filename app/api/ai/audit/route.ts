import { NextRequest, NextResponse } from "next/server";
import { auditProfileFlow } from "@/lib/ai/flows";
import type { Profile } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { profile } = (await req.json()) as { profile?: Profile };
    if (!profile) {
      return NextResponse.json({ error: "Missing profile" }, { status: 400 });
    }
    const result = await auditProfileFlow(profile);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI audit failed" },
      { status: 500 },
    );
  }
}
