"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signInWithEmail, logout, mapAuthError } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";

export default function AdminLoginPage() {
  const { account, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [signing, setSigning] = useState(false);

  /* Once auth resolves, check if this account is an admin */
  useEffect(() => {
    if (!loading && account) {
      if (account.role === "admin") {
        router.replace("/admin");
      } else {
        /* Logged in but not admin — sign them out */
        logout().then(() =>
          setError("This account doesn't have admin access."),
        );
      }
    }
  }, [account, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError("");
    setSigning(true);
    try {
      await signInWithEmail(email.trim(), password);
      /* AuthProvider will load the account → useEffect above handles redirect */
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-950 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Logo />
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-400/12 px-3 py-1 text-xs font-medium text-gold-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Portal
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold text-white">
            Admin Sign In
          </h1>
          <p className="mt-1 text-sm text-white/45">
            Restricted to authorized administrators only.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Email address
            </label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/60">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={signing}
            disabled={signing || !email.trim() || !password}
            className="mt-2"
          >
            Sign in to Admin
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-white/25">
          This portal is for platform administrators only.
          <br />
          Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
