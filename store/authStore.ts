import { create } from "zustand";
import type { User } from "firebase/auth";
import type { AccountUser } from "@/types";

interface AuthState {
  firebaseUser: User | null;
  account: AccountUser | null;
  /** True until the first auth state resolves. */
  loading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setAccount: (account: AccountUser | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  account: null,
  loading: true,
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setAccount: (account) => set({ account }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ firebaseUser: null, account: null, loading: false }),
}));
