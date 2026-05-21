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
import { toast } from "@/store/uiStore";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Enter your full name.");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      await signUpWithEmail(name.trim(), email.trim(), password);
      toast.success("Account created — let's build your profile!");
      router.replace("/profile");
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
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
      <GoogleAuthButton label="Sign up with Google" />
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
        <Button type="submit" fullWidth size="lg" loading={loading}>
          Create account
        </Button>
        <p className="text-center text-xs text-white/35">
          By signing up you agree to our Terms & Privacy Policy.
        </p>
      </form>
    </AuthShell>
  );
}
