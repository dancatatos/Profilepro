import { create } from "zustand";
import { uid } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

interface UIState {
  toasts: ToastItem[];
  pushToast: (tone: ToastTone, message: string) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  pushToast: (tone, message) => {
    const id = uid("toast");
    set((s) => ({ toasts: [...s.toasts, { id, tone, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Imperative toast helper — usable outside React components. */
export const toast = {
  success: (m: string) => useUIStore.getState().pushToast("success", m),
  error: (m: string) => useUIStore.getState().pushToast("error", m),
  info: (m: string) => useUIStore.getState().pushToast("info", m),
};
