"use client";

/**
 * Affiliate login page.
 *
 * Visually distinct from /login (different copy, different post-login
 * destination) so affiliates always land in /affiliate, not the regular
 * customer dashboard. Uses the same AuthShell layout for brand
 * continuity.
 *
 * No Google sign-in here — affiliates have email/password set during
 * the invite-accept flow, and we don't want them accidentally creating
 * a "customer" account via Google when they thought they were signing
 * into their affiliate dashboard.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Handshake, Lock, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mapAuthError, signInWithEmail } from "@/lib/firebase/auth";
import { isValidEmail } from "@/lib/utils";
import { toast } from "@/store/uiStore";

export default function AffiliateLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!password) return setError("Enter your password.");

    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      toast.success("Signed in.");
      /* Always land in the affiliate dashboard. The (app)/layout will
         additionally bounce affiliates away from the customer area, so
         even if Firebase sets the auth state before this router push
         resolves, they end up in the right place. */
      router.replace("/affiliate");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Affiliate sign in"
      subtitle="Access your referral dashboard, earnings and payout settings."
      footer={
        <>
          Not an affiliate yet?{" "}
          <Link href="/" className="font-semibold text-electric-400">
            Get in touch
          </Link>
        </>
      }
    >
      <div className="mb-5 flex items-center gap-2 rounded-xl border border-electric-500/20 bg-electric-500/[0.04] p-3 text-xs text-electric-200/80">
        <Handshake className="h-4 w-4 shrink-0 text-electric-300" />
        <span>
          Invite-only program. Use the email and password you set when you
          accepted the invite.
        </span>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />
        <Input
          name="password"
          type={show ? "text" : "password"}
          label="Password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          autoComplete="current-password"
          error={error}
          rightSlot={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="rounded-lg p-2 text-white/35 hover:text-white/70"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-white/50 hover:text-white/80"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
