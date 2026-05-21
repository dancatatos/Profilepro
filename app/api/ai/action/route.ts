import { NextRequest, NextResponse } from "next/server";
import { AI_ACTIONS } from "@/lib/ai/actions";
import type { AICopyMode, AILanguage } from "@/types";

export const dynamic = "force-dynamic";

interface ActionBody {
  actionId?: string;
  context?: string;
  mode?: AICopyMode;
  language?: AILanguage;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ActionBody;
    const action = body.actionId ? AI_ACTIONS[body.actionId] : undefined;
    if (!action) {
      return NextResponse.json(
        { error: `Unknown AI action: ${body.actionId}` },
        { status: 400 },
      );
    }
    const result = await action(body.context ?? "", {
      mode: body.mode ?? "professional",
      language: body.language ?? "english",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI action failed" },
      { status: 500 },
    );
  }
}
