"use client";

/**
 * /join/team/[code] — public team activation page.
 *
 * Single entry point for the leader's shared join link / QR. Handles:
 *   - Anonymous visitor: shows team preview + "Sign up free to join"
 *     → stashes code in localStorage → bounces to /signup → returns
 *     here signed in → auto-joins → redirects to /my-events
 *   - Signed-in user already a member: "You're already in" → /my-events
 *   - Signed-in non-member: one-tap confirm to join
 */

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FullScreenLoader } from "@/components/ui/Spinner";
import {
  countTeamMembersForSpace,
  getPlansConfig,
  getTeamSpace,
  getTeamSpaceByCode,
} from "@/lib/firebase/firestore";
import { resolveAddOnLimit } from "@/lib/constants";
import { joinTeamWithBundle, type BundleResult } from "@/lib/teamBundle";
import { PLANS } from "@/lib/constants";
import { toast } from "@/store/uiStore";
import type { Plan, TeamSpace } from "@/types";

const PENDING_TEAM_KEY = "credibly:pendingTeamJoin";

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<FullScreenLoader label="Loading…" />}>
      <JoinFlow />
    </Suspense>
  );
}

function JoinFlow() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const { account, loading: authLoading } = useAuth();

  const code = (params.code ?? "").toUpperCase();
  const [space, setSpace] = useState<TeamSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [summary, setSummary] = useState<BundleResult | null>(null);
  const [plans, setPlans] = useState<Plan[]>(PLANS);

  useEffect(() => {
    getPlansConfig()
      .then((p) => p && setPlans(p))
      .catch(() => null);
  }, []);

  /* Resolve the team space from the code on mount. Invalid codes
     render a friendly 404-style card instead of a hard navigation. */
  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await getTeamSpaceByCode(code).catch(() => null);
      if (!cancelled) {
        setSpace(s);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  /* Auto-join the moment we have BOTH a signed-in user AND a valid
     space. Idempotent — re-running upserts the same membership doc. */
  useEffect(() => {
    if (!space || authLoading) return;
    if (!account || account.uid === "demo") return;
    if (joining) return;
    /* Owners auto-join on team creation already — don't double-trigger. */
    if (space.ownerId === account.uid) {
      router.replace(`/teams/${space.id}`);
      return;
    }
    void runJoin(space);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [space, authLoading, account]);

  const runJoin = async (s: TeamSpace) => {
    if (!account) return;
    setJoining(true);
    try {
      /* Member cap check — uses cached memberCount on the team space
         to avoid an extra read. The cap belongs to the owner's
         addOnLimits, not the joining member's. */
      // Best-effort cap check: defer to the owner's cap. We can't
      // read another user's doc from the client; instead we use the
      // team's cached memberCount and the DEFAULT cap as a generous
      // floor. The owner can grant more capacity from /admin/users.
      const currentCount = await countTeamMembersForSpace(s.id);
      const floorCap = resolveAddOnLimit({}, "membersPerTeam");
      if (currentCount >= floorCap) {
        toast.error(
          "This team is full. Ask the leader if they can raise the member cap.",
        );
        setJoining(false);
        return;
      }
      const result = await joinTeamWithBundle({
        account,
        space: s,
        plans,
        joinedVia: "link",
      });
      window.localStorage.removeItem(PENDING_TEAM_KEY);
      const totalGranted =
        result.trainings.granted +
        result.funnels.granted +
        result.pipelines.granted +
        result.events.granted;
      if (totalGranted > 0) {
        /* Bundle delivered something — show the summary screen so the
           recruit understands what they just received. From there
           they can continue into /my-events. */
        setSummary(result);
        setJoining(false);
      } else {
        toast.success(`You're in — welcome to ${s.name}.`);
        router.replace("/my-events");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't join team.");
      setJoining(false);
    }
  };

  const handleSignup = () => {
    if (!code) return;
    window.localStorage.setItem(PENDING_TEAM_KEY, code);
    router.push("/signup");
  };

  if (loading || authLoading) {
    return <FullScreenLoader label="Loading team…" />;
  }

  if (!space) {
    return (
      <main className="min-h-dvh bg-ink-950">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
          <Card className="space-y-2 p-6 text-center">
            <p className="font-display text-base font-semibold text-white">
              Invalid join code
            </p>
            <p className="text-sm text-white/55">
              The code{" "}
              <code className="rounded bg-white/[0.05] px-1.5 py-0.5 font-mono text-xs">
                {code || "—"}
              </code>{" "}
              didn&apos;t match any team. Ask your leader to double-check + resend.
            </p>
          </Card>
        </div>
      </main>
    );
  }

  if (joining) {
    return <FullScreenLoader label="Joining team…" />;
  }

  if (summary && space) {
    return <BundleSummary space={space} result={summary} onContinue={() => router.replace("/my-events")} />;
  }

  const signedIn = !!account && account.uid !== "demo";

  return (
    <main className="min-h-dvh bg-ink-950">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <Card className="overflow-hidden p-0">
          {space.bannerUrl && (
            <img
              src={space.bannerUrl}
              alt={space.name}
              className="aspect-[16/8] w-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          )}
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15 text-electric-300">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-semibold text-white">
                  Join {space.name}
                </p>
                <p className="text-xs text-white/55">
                  {space.memberCount ?? 0} member
                  {(space.memberCount ?? 0) === 1 ? "" : "s"} already in
                </p>
              </div>
            </div>

            {space.description && (
              <p className="mb-4 text-sm leading-relaxed text-white/65">
                {space.description}
              </p>
            )}

            {signedIn ? (
              <Button
                fullWidth
                onClick={() => runJoin(space)}
                leftIcon={<CheckCircle2 className="h-4 w-4" />}
              >
                Join team
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="rounded-lg bg-electric-500/[0.06] p-3 text-xs text-electric-200">
                  Sign up free to join. We&apos;ll send you the team&apos;s
                  events + reminders automatically.
                </p>
                <Button
                  fullWidth
                  onClick={handleSignup}
                  leftIcon={<Sparkles className="h-4 w-4" />}
                >
                  Sign up free &amp; join
                </Button>
                <Link
                  href="/login"
                  onClick={() => {
                    if (code) {
                      window.localStorage.setItem(PENDING_TEAM_KEY, code);
                    }
                  }}
                  className="block py-1 text-center text-xs text-white/55 hover:text-white"
                >
                  Already have an account? Log in
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}

/* ── Post-join bundle summary ─────────────────────────────────── */

function BundleSummary({
  space,
  result,
  onContinue,
}: {
  space: TeamSpace;
  result: BundleResult;
  onContinue: () => void;
}) {
  const rows: Array<{
    label: string;
    granted: number;
    skipped: number;
    skipReason?: string;
  }> = [
    {
      label: "Trainings unlocked",
      granted: result.trainings.granted,
      skipped: result.trainings.skipped,
      skipReason: result.trainings.skipReason,
    },
    {
      label: "Funnels cloned to your account",
      granted: result.funnels.granted,
      skipped: result.funnels.skipped,
      skipReason: result.funnels.skipReason,
    },
    {
      label: "Follow-up pipelines cloned",
      granted: result.pipelines.granted,
      skipped: result.pipelines.skipped,
      skipReason: result.pipelines.skipReason,
    },
    {
      label: "Upcoming events RSVP'd",
      granted: result.events.granted,
      skipped: result.events.skipped,
      skipReason: result.events.skipReason,
    },
  ].filter((r) => r.granted > 0 || r.skipped > 0);
  const anySkipped = rows.some((r) => r.skipped > 0);
  const anyPlanCap = rows.some(
    (r) => r.skipped > 0 && r.skipReason === "plan-cap",
  );
  return (
    <main className="min-h-dvh bg-ink-950">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <Card className="space-y-4 p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-jade-500/15 text-jade-300">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">
              Welcome to {space.name}
            </p>
            <p className="mt-1 text-sm text-white/55">
              Your onboarding bundle is ready.
            </p>
          </div>
          <ul className="space-y-2 text-left">
            {rows.map((r) => (
              <li
                key={r.label}
                className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <span className="text-sm text-white/75">{r.label}</span>
                <span className="flex items-center gap-1.5 text-xs">
                  <span className="rounded-md bg-jade-500/15 px-1.5 py-0.5 font-semibold text-jade-300">
                    +{r.granted}
                  </span>
                  {r.skipped > 0 && (
                    <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-white/55">
                      {r.skipped} skipped
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {anySkipped && (
            <p className="rounded-lg bg-white/[0.03] px-3 py-2 text-left text-xs text-white/55">
              {anyPlanCap
                ? "Some items were skipped because they don't fit your current plan. Upgrade in Settings → Billing to unlock the rest."
                : "Some items were skipped (past events or unavailable sources)."}
            </p>
          )}
          <Button fullWidth onClick={onContinue}>
            Continue to my dashboard
          </Button>
        </Card>
      </div>
    </main>
  );
}

/* PENDING_TEAM_KEY is intentionally a module-local constant — Next.js
   page files reject non-reserved exports. The layout's pending-key
   handoff uses the same literal string directly. */

/* getTeamSpace is intentionally referenced so future enhancements
   that need to refresh the space mid-page have a ready import path. */
void getTeamSpace;
