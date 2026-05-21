"use client";

import { useAuthStore } from "@/store/authStore";

/** Convenience selector for auth state across the app. */
export function useAuth() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const account = useAuthStore((s) => s.account);
  const loading = useAuthStore((s) => s.loading);
  return {
    firebaseUser,
    account,
    loading,
    isAuthed: !!firebaseUser,
    isAdmin: account?.role === "admin",
  };
}
