"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useUIStore, type ToastTone } from "@/store/uiStore";

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-jade-400" />,
  error: <XCircle className="h-5 w-5 text-red-400" />,
  info: <Info className="h-5 w-5 text-electric-400" />,
};

export function ToastViewport() {
  const { toasts, dismissToast } = useUIStore();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-3 pt-safe">
      <div className="mt-3 flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              layout
              initial={{ y: -40, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              onClick={() => dismissToast(t.id)}
              className="glass-strong pointer-events-auto flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left shadow-glass"
            >
              {ICONS[t.tone]}
              <span className="flex-1 text-sm text-white/90">{t.message}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
