"use client";

/**
 * /training — public activation-code redeem page.
 *
 * The single entry point for learners who got an activation code from
 * their team leader. Handles every state:
 *
 *   1. Not signed in + no code in URL
 *        → ask for code → store in localStorage → redirect to signup
 *   2. Not signed in + ?code=XXX in URL
 *        → store code in localStorage → redirect to signup
 *   3. Signed in + pending code in localStorage
 *        → activate it, redirect to the public training page
 *   4. Signed in + manual code entry
 *        → activate it directly
 *
 * The localStorage handoff means we don't have to thread `?next=` /
 * `?code=` through the existing signup flow — the redeem page is the
 * single source of truth for the activation state machine.
 */

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GraduationCap, KeyRound, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  activateTrainingForUser,
  getTrainingByActivationCode,
  getProfile,
  listTrainingAccessForUser,
  getPlansConfig,
} from "@/lib/firebase/firestore";
import { resolveUserTrainingsActivateLimit, PLANS as DEFAULT_PLANS } from "@/lib/constants";
import { toast } from "@/store/uiStore";

const PENDING_CODE_KEY = "credibly:pendingTrainingCode";

export default function TrainingRedeemPage() {
  return (
    <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <RedeemFlow />
    </Suspense>
  );
}

function RedeemFlow() {
  const router = useRouter();
  const search = useSearchParams();
  const { account, loading: authLoading } = useAuth();

  /* Code state — seeded from URL ?code=XXX or localStorage on mount. */
  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  /* "ready" when we've reconciled URL + localStorage; before that
     we hide UI so it doesn't flash the wrong state. */
  const [ready, setReady] = useState(false);

  /* Pull a code from the URL into state + localStorage on first load,
     so a freshly-signed-up user (who's bounced through /signup) can
     come back and have us auto-activate. */
  useEffect(() => {
    const fromUrl = search?.get("code")?.trim().toUpperCase() ?? "";
    if (fromUrl) {
      window.localStorage.setItem(PENDING_CODE_KEY, fromUrl);
      setCode(fromUrl);
    } else {
      const pending = window.localStorage.getItem(PENDING_CODE_KEY);
      if (pending) setCode(pending);
    }
    setReady(true);
  }, [search]);

  /* Once we know the user is signed in AND we have a code, run the
     activation. Single-fire — gated on activating + the code. */
  useEffect(() => {
    if (!ready || authLoading) return;
    if (!account || account.uid === "demo") return;
    if (!code) return;
    if (activating) return;
    void doActivate(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authLoading, account, code]);

  const doActivate = async (rawCode: string) => {
    if (!account || account.uid === "demo") return;
    setActivating(true);
    const upper = rawCode.trim().toUpperCase();
    try {
      const training = await getTrainingByActivationCode(upper);
      if (!training) {
        toast.error("That code didn't match any training. Double-check and try again.");
        window.localStorage.removeItem(PENDING_CODE_KEY);
        setActivating(false);
        return;
      }
      /* Activation cap check — count existing access records, compare
         to the user's plan limit. 999 is the "unlimited" sentinel. */
      const [accesses, plans] = await Promise.all([
        listTrainingAccessForUser(account.uid),
        getPlansConfig().catch(() => null),
      ]);
      const effectivePlans = plans && plans.length > 0 ? plans : DEFAULT_PLANS;
      const cap = resolveUserTrainingsActivateLimit(account, effectivePlans);
      const alreadyHas = accesses.some((a) => a.trainingId === training.id);
      if (!alreadyHas && cap < 999 && accesses.length >= cap) {
        toast.error(
          cap === 1
            ? "Your free plan allows 1 training at a time. Upgrade to Pro to unlock more."
            : `You've hit your library cap (${cap}). Upgrade or remove an existing training to make room.`,
        );
        window.localStorage.removeItem(PENDING_CODE_KEY);
        setActivating(false);
        return;
      }
      /* Activate (idempotent — re-running doesn't duplicate). */
      await activateTrainingForUser({
        userId: account.uid,
        trainingId: training.id,
        ownerId: training.ownerId,
        unlockedVia: "activation",
        activationCode: upper,
      });
      window.localStorage.removeItem(PENDING_CODE_KEY);
      /* Need the owner's username to build the public URL. */
      const ownerProfile = await getProfile(training.ownerId).catch(() => null);
      const ownerUsername = ownerProfile?.username ?? "";
      toast.success(`Unlocked "${training.title}" — enjoy!`);
      if (ownerUsername) {
        router.replace(`/${ownerUsername}/t/${training.slug}`);
      } else {
        router.replace("/trainings");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed.");
      setActivating(false);
    }
  };

  const handleManualSubmit = () => {
    if (!code.trim()) {
      toast.error("Enter an activation code first.");
      return;
    }
    if (!account || account.uid === "demo") {
      /* Not signed in — stash code and bounce to signup. The redeem
         flow will pick it up on return. */
      window.localStorage.setItem(
        PENDING_CODE_KEY,
        code.trim().toUpperCase(),
      );
      router.push("/signup");
      return;
    }
    void doActivate(code);
  };

  /* While activating, show a friendly loader so the user doesn't
     see the form flicker. */
  if (activating) {
    return <FullScreenLoader label="Unlocking your training…" />;
  }

  const signedIn = !!account && account.uid !== "demo";

  return (
    <main className="min-h-dvh bg-ink-950">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-blue">
            <GraduationCap className="h-7 w-7 text-white" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-white">
            Unlock a training
          </h1>
          <p className="mt-1 text-sm text-white/55">
            Enter the activation code your team leader gave you.
          </p>
        </div>

        <Card className="space-y-4 p-5">
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-white/65">
              <KeyRound className="h-3.5 w-3.5" />
              Activation code
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleManualSubmit();
              }}
              placeholder="ACTIVATE-XXXXX"
              className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 font-mono text-sm uppercase tracking-wider text-white outline-none placeholder:text-white/30 focus:border-electric-500/60"
            />
            <p className="mt-1.5 text-[11px] text-white/40">
              Looks like <code>ACTIVATE-AB12C</code>. Codes are case-insensitive.
            </p>
          </div>

          {signedIn ? (
            <Button
              fullWidth
              onClick={handleManualSubmit}
              loading={activating}
              leftIcon={<Sparkles className="h-3.5 w-3.5" />}
            >
              Unlock training
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="rounded-lg bg-electric-500/[0.06] p-3 text-xs text-electric-200">
                You&apos;ll need a free Credibly account so your training
                is saved to your library. Takes 30 seconds.
              </p>
              <Button
                fullWidth
                onClick={handleManualSubmit}
                leftIcon={<Sparkles className="h-3.5 w-3.5" />}
              >
                Sign up free &amp; unlock
              </Button>
              <Link
                href="/login"
                onClick={() => {
                  if (code.trim()) {
                    window.localStorage.setItem(
                      PENDING_CODE_KEY,
                      code.trim().toUpperCase(),
                    );
                  }
                }}
                className="block py-1 text-center text-xs text-white/55 hover:text-white"
              >
                Already have an account? Log in
              </Link>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-[11px] text-white/35">
          Lost your code? Ask the leader who shared the training to send it again.
        </p>
      </div>
    </main>
  );
}
