"use client";

import { useEffect, type ReactNode } from "react";
import { watchAuth } from "@/lib/firebase/auth";
import { ensureAccount } from "@/lib/firebase/account";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/authStore";
import type { AccountUser } from "@/types";

/**
 * Demo account used when Firebase isn't configured yet — lets the
 * whole dashboard be explored locally before credentials are wired.
 */
export const DEMO_ACCOUNT: AccountUser = {
  uid: "demo",
  email: "demo@credibly.app",
  displayName: "Demo User",
  photoURL: "",
  role: "admin",
  plan: "pro",
  username: "demo",
  onboardingComplete: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/** Bootstraps Firebase auth state into the global auth store. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setFirebaseUser = useAuthStore((s) => s.setFirebaseUser);
  const setAccount = useAuthStore((s) => s.setAccount);
  const setLoading = useAuthStore((s) => s.setLoading);
  const reset = useAuthStore((s) => s.reset);

  useEffect(() => {
    // No Firebase yet → run a local demo session.
    if (!isFirebaseConfigured) {
      setFirebaseUser(null);
      setAccount(DEMO_ACCOUNT);
      setLoading(false);
      return;
    }

    const unsubscribe = watchAuth(async (user) => {
      if (!user) {
        reset();
        return;
      }
      setFirebaseUser(user);
      try {
        setAccount(await ensureAccount(user));
      } catch (err) {
        console.warn("[Credibly] account bootstrap failed:", err);
        // Fallback: build a minimal account from the Firebase user so we
        // never land in a login ↔ dashboard redirect loop if Firestore
        // is temporarily unavailable.
        setAccount({
          uid: user.uid,
          email: user.email ?? "",
          displayName:
            user.displayName ?? user.email?.split("@")[0] ?? "User",
          photoURL: user.photoURL ?? "",
          role: "user",
          plan: "free",
          username: user.uid.slice(0, 8),
          onboardingComplete: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [reset, setAccount, setFirebaseUser, setLoading]);

  return <>{children}</>;
}
