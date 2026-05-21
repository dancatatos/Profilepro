import { NextRequest, NextResponse } from "next/server";
import { assistantStreamFlow } from "@/lib/ai/flows";
import type { AIChatMessage } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as { messages?: AIChatMessage[] };
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }
    const stream = await assistantStreamFlow(messages);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI chat failed" },
      { status: 500 },
    );
  }
}
