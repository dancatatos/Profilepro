"use client";

/**
 * /join — generic landing page for entering a join code by hand.
 *
 * For users who:
 *   - Got the code from their leader (FB Group post, Telegram, voice)
 *     but don't have the QR or direct link
 *   - Are stuck on iOS where the in-browser PWA can't intercept the
 *     QR URL automatically
 *   - Just prefer typing
 *
 * On submit we redirect to /join/team/[code], which is the same flow
 * the QR + shared link use. Single source of truth for the actual
 * activation logic — this page is just the input.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function JoinByCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const submit = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    /* Both team join codes (JOIN-XXXXX) and event codes share the same
       activation flow — the team-join page will resolve the code and
       handle the rest. */
    router.push(`/join/team/${trimmed}`);
  };

  return (
    <main className="min-h-dvh bg-ink-950">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-blue">
            <KeyRound className="h-7 w-7 text-white" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            Join a team
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Got a join code from your team leader? Enter it below.
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/65">
              <KeyRound className="h-3.5 w-3.5" />
              Join code
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="JOIN-XXXXX"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-sm uppercase tracking-wider text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
            <p className="mt-1.5 text-[11px] text-white/40">
              Looks like <code>JOIN-AB12C</code>. Codes are case-insensitive.
            </p>
          </div>

          <Button
            fullWidth
            onClick={submit}
            disabled={!code.trim()}
            leftIcon={<Sparkles className="h-3.5 w-3.5" />}
          >
            Continue
          </Button>
        </Card>

        <p className="mt-6 text-center text-[11px] text-white/35">
          Lost your code? Ask the leader who shared the team to send it again.
        </p>
      </div>
    </main>
  );
}
