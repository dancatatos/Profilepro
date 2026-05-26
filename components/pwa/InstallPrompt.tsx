"use client";

/**
 * Bottom "Add to Home Screen" banner.
 *
 * Subscribes to the shared InstallProvider so it picks up the captured
 * beforeinstallprompt event from the single root listener. Dismissals
 * are remembered per-browser via localStorage so this never nags after
 * the user has said no.
 *
 * The manual install button on /settings exists as a fallback for when
 * the user has dismissed this banner — see components/pwa/InstallButton.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, X } from "lucide-react";
import { useInstall } from "@/components/providers/InstallProvider";

const DISMISS_KEY = "credibly:install-dismissed";

export default function InstallPrompt() {
  const { canInstall, isInstalled, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) setDismissed(true);
  }, []);

  const visible = canInstall && !isInstalled && !dismissed;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* localStorage may be unavailable in private mode — fail silent */
    }
  };

  const install = async () => {
    const outcome = await promptInstall();
    /* On dismiss the prompt closes but the user might still want to
       install later from /settings — don't permanently dismiss the
       banner in that case, only on accepted. */
    if (outcome === "accepted") dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-md"
        >
          <div className="glass-strong flex items-center gap-3 rounded-2xl p-3 shadow-glass">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-blue">
              <Download className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Install Credibly
              </p>
              <p className="truncate text-xs text-white/55">
                Add to your home screen for the full app experience.
              </p>
            </div>
            <button
              onClick={install}
              className="rounded-xl bg-brand-gradient px-3.5 py-2 text-xs font-semibold text-white no-tap-highlight active:scale-95"
            >
              Install
            </button>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="rounded-lg p-1.5 text-white/40 no-tap-highlight active:scale-90"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
