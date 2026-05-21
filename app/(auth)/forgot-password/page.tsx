"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, Mail } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mapAuthError, resetPassword } from "@/lib/firebase/auth";
import { isValidEmail } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");

    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? "Check your inbox" : "Reset your password"}
      subtitle={
        sent
          ? "We've sent you a secure link to set a new password."
          : "Enter your email and we'll send you a reset link."
      }
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-semibold text-electric-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-jade-500/12">
            <MailCheck className="h-7 w-7 text-jade-400" />
          </span>
          <p className="mt-4 text-sm text-white/60">
            A password reset link is on its way to
          </p>
          <p className="text-sm font-semibold text-white">{email}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            name="email"
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
            error={error}
            autoComplete="email"
          />
          <Button type="submit" fullWidth size="lg" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
