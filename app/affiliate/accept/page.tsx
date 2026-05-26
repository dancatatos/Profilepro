"use client";

/**
 * Affiliate invite accept page.
 *
 * Flow:
 *   1. Reads `?token=…` from the URL.
 *   2. Fetches the invite from Firestore via the token.
 *   3. Validates it's still pending + not expired.
 *   4. Shows a "set password" form with the invited email locked in.
 *   5. On submit: creates the Firebase Auth user, then writes both the
 *      `/users/{uid}` doc (with role=affiliate) and `/affiliates/{uid}`
 *      doc (with the code reserved at invite time), then marks the
 *      invite accepted. Firebase auto-signs-in the newly created user,
 *      so we just redirect to /affiliate.
 *
 * This is the only place we set role="affiliate" — admins can't promote
 * an existing user to an affiliate yet (Step 4 may add that). Invite
 * tokens are single-use; revisiting after acceptance shows a "already
 * used" state rather than allowing a second account on the same token.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { signUpWithEmail, mapAuthError } from "@/lib/firebase/auth";
import {
  getAffiliateInvite,
  markInviteAccepted,
  upsertAffiliate,
  upsertUserDoc,
  isAffiliateCodeAvailable,
} from "@/lib/firebase/firestore";
import { toast } from "@/store/uiStore";
import { slugify } from "@/lib/utils";
import type { Affiliate, AccountUser, AffiliateInvite } from "@/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready"; invite: AffiliateInvite };

/* Next.js 15 requires useSearchParams to be inside a Suspense boundary
   when the page might be statically pre-rendered — wrap the actual
   content in one and re-export the wrapper as the page default. */
export default function AffiliateAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        </div>
      }
    >
      <AcceptContent />
    </Suspense>
  );
}

function AcceptContent() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  /* Fetch the invite once on mount. */
  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", reason: "Missing invite token in URL." });
      return;
    }
    (async () => {
      try {
        const invite = await getAffiliateInvite(token);
        if (!invite) {
          setState({
            kind: "invalid",
            reason:
              "This invite link is no longer valid. Ask the admin to send you a new one.",
          });
          return;
        }
        if (invite.status === "accepted") {
          setState({
            kind: "invalid",
            reason:
              "This invite has already been used. If that wasn't you, ask the admin to send a new one.",
          });
          return;
        }
        if (invite.status === "revoked") {
          setState({
            kind: "invalid",
            reason: "This invite was cancelled. Please ask the admin for a new one.",
          });
          return;
        }
        if (invite.expiresAt && Date.now() > invite.expiresAt) {
          setState({
            kind: "invalid",
            reason:
              "This invite has expired. Ask the admin to send you a fresh one.",
          });
          return;
        }
        setState({ kind: "ready", invite });
      } catch {
        setState({
          kind: "invalid",
          reason:
            "Couldn't load this invite. Please check your connection and try again.",
        });
      }
    })();
  }, [token]);

  const invite = state.kind === "ready" ? state.invite : null;

  const pwError = useMemo(() => {
    if (!password) return "";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (confirm && confirm !== password) return "Passwords don't match.";
    return "";
  }, [password, confirm]);

  const submit = async () => {
    if (!invite) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      /* Defensive double-check: the code might have been claimed by
         another admin-created affiliate between invite + accept. If so
         we fall through and try anyway — the rules will only refuse if
         the code truly clashes — and we display the underlying error. */
      const available = await isAffiliateCodeAvailable(invite.code);
      if (!available) {
        toast.error(
          `The code "${invite.code}" is no longer available. Ask the admin to issue a new invite with a different code.`,
        );
        setSubmitting(false);
        return;
      }

      /* createUserWithEmailAndPassword auto-signs-in the new user. */
      const user = await signUpWithEmail(
        invite.displayName,
        invite.email,
        password,
      );
      const now = Date.now();

      /* Build the user doc — affiliates don't need a username slug for
         a public profile, but we generate one anyway so they conform
         to the schema and don't NaN-out any future profile features. */
      const username = slugify(invite.displayName) || `aff-${user.uid.slice(0, 6)}`;
      const accountDoc: AccountUser = {
        uid: user.uid,
        email: invite.email,
        displayName: invite.displayName,
        photoURL: "",
        role: "affiliate",
        plan: "free",
        username,
        onboardingComplete: true,
        createdAt: now,
        updatedAt: now,
      };
      await upsertUserDoc(accountDoc);

      /* Build the affiliate doc. */
      const affiliateDoc: Affiliate = {
        uid: user.uid,
        code: invite.code,
        email: invite.email,
        displayName: invite.displayName,
        status: "active",
        adminNotes: invite.adminNotes,
        createdAt: now,
        updatedAt: now,
        stats: {
          totalReferrals: 0,
          activeReferrals: 0,
          totalEarned: 0,
          pendingPayout: 0,
          paidOut: 0,
        },
      };
      await upsertAffiliate(affiliateDoc);

      /* Mark invite consumed last — if it errors the worst case is the
         invite stays visible but no duplicate account can be created
         because the email is now in Firebase Auth. */
      await markInviteAccepted(token, user.uid);

      setDone(true);
      toast.success(`Welcome, ${invite.displayName}!`);
      /* Brief delay so the success state is perceptible before redirect. */
      setTimeout(() => router.replace("/affiliate"), 1200);
    } catch (err) {
      toast.error(mapAuthError(err));
      setSubmitting(false);
    }
  };

  /* ── Render ── */

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-5">
        <div className="flex items-center gap-2 text-sm text-white/55">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your invite…
        </div>
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div className="flex min-h-dvh items-center justify-center p-5">
        <Card className="max-w-md p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="font-display text-lg font-semibold text-white">
            Invite not available
          </h1>
          <p className="mt-2 text-sm text-white/55">{state.reason}</p>
          <Button
            className="mt-6"
            fullWidth
            href="/"
            variant="outline"
          >
            Back to homepage
          </Button>
        </Card>
      </div>
    );
  }

  if (done && invite) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-5">
        <Card className="max-w-md p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-jade-500/10 text-jade-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="font-display text-lg font-semibold text-white">
            Welcome aboard, {invite.displayName.split(" ")[0]}!
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Your affiliate account is ready. Sending you to your dashboard…
          </p>
        </Card>
      </div>
    );
  }

  /* state.kind === "ready" */
  return (
    <div className="flex min-h-dvh items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <Card className="p-6">
          <div className="mb-5 text-center">
            <p className="mb-1 inline-block rounded-full bg-electric-500/12 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-electric-300">
              Affiliate invite
            </p>
            <h1 className="mt-2 font-display text-xl font-bold text-white">
              Welcome, {invite!.displayName.split(" ")[0]} 👋
            </h1>
            <p className="mt-1.5 text-sm text-white/55">
              You&apos;ve been invited as a Credibly affiliate. Set a password
              to activate your account.
            </p>
          </div>

          <div className="mb-5 space-y-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/45">Name</span>
              <span className="font-medium text-white">{invite!.displayName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/45">Email</span>
              <span className="truncate font-medium text-white">{invite!.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-white/45">Your code</span>
              <span className="rounded-md bg-electric-500/12 px-2 py-0.5 font-mono text-xs font-semibold text-electric-300">
                {invite!.code}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              leftIcon={<KeyRound className="h-4 w-4" />}
              error={pwError && password.length < 6 ? pwError : undefined}
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              leftIcon={<KeyRound className="h-4 w-4" />}
              error={
                confirm && password !== confirm ? "Passwords don't match." : undefined
              }
            />
          </div>

          <Button
            className="mt-5"
            fullWidth
            loading={submitting}
            disabled={submitting || password.length < 6 || password !== confirm}
            onClick={submit}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Activate my affiliate account
          </Button>
        </Card>

        <p className="mt-4 text-center text-[11px] text-white/30">
          By activating you agree to act fairly when promoting Credibly. Payouts
          are processed manually on the schedule agreed with your admin.
        </p>
      </div>
    </div>
  );
}
