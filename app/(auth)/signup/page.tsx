"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { OrDivider } from "@/components/auth/Divider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mapAuthError, signUpWithEmail } from "@/lib/firebase/auth";
import { isValidEmail } from "@/lib/utils";
import { recordPendingConsent } from "@/lib/consent";
import { toast } from "@/store/uiStore";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /* Privacy-policy + Terms agreement. Required — must be actively
     ticked (defaults to false) because pre-checked consent boxes
     don't satisfy the PH Data Privacy Act or GDPR. */
  const [agreed, setAgreed] = useState(false);
  /* Marketing opt-in. Separate from the required consent so it can
     be revoked independently and audited cleanly. Defaults to false
     — explicit opt-in only. */
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  /* Tiny helper to write consent to sessionStorage right before either
     signup path fires. ensureAccount() reads it back when creating
     the user doc, so it ends up persisted with timestamp + version. */
  const stashConsent = () => recordPendingConsent(marketingOptIn);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (!agreed)
      return setError("Please agree to the Terms and Privacy Policy.");

    setLoading(true);
    try {
      stashConsent();
      await signUpWithEmail(name.trim(), email.trim(), password);
      toast.success("Account created — let's build your profile!");
      router.replace("/profile");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  /* Google sign-in path also needs the consent gate. We pass the
     onBeforeSignIn callback so the button can intercept and either
     stash consent OR show an error if the box isn't ticked. */
  const handleGoogleBeforeSignIn = (): boolean => {
    if (!agreed) {
      toast.error("Please agree to the Terms and Privacy Policy first.");
      return false; // block the popup
    }
    stashConsent();
    return true;
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Build a profile that builds trust — free to start."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-electric-400">
            Log in
          </Link>
        </>
      }
    >
      <GoogleAuthButton
        label="Sign up with Google"
        onBeforeSignIn={handleGoogleBeforeSignIn}
      />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          name="name"
          label="Full name"
          placeholder="Jasmine Cruz"
          value={name}
          onChange={(e) => setName(e.target.value)}
          leftIcon={<UserRound className="h-4 w-4" />}
          autoComplete="name"
        />
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
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          autoComplete="new-password"
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

        {/* Consent — required. Unchecked by default per DPA / GDPR. */}
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.04]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-electric-500"
          />
          <span className="text-xs leading-relaxed text-white/70">
            I agree to Credibly&apos;s{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-medium text-electric-300 hover:text-electric-200"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="font-medium text-electric-300 hover:text-electric-200"
            >
              Privacy Policy
            </Link>
            . I understand my data will be processed as described.
          </span>
        </label>

        {/* Marketing opt-in — optional, defaults to OFF. */}
        <label className="flex cursor-pointer items-start gap-2.5 px-1 pb-1">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-white/[0.04] accent-electric-500"
          />
          <span className="text-xs leading-relaxed text-white/55">
            Send me occasional product updates, tips and recruiting playbooks.
            <span className="text-white/35"> (Optional, no spam.)</span>
          </span>
        </label>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading}
          disabled={!agreed}
        >
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
