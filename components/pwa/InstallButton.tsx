"use client";

/**
 * Manual "Install App" card — drop-in for any settings/profile page.
 *
 * Shows three different states based on what the platform allows:
 *
 *   Already installed → success badge ("✓ Installed"), no action.
 *   beforeinstallprompt fired → "Install Credibly" button → native prompt.
 *   iOS Safari (no programmatic install API) → "Install on iPhone"
 *     button → opens an instructions modal with the Share → Add to
 *     Home Screen steps.
 *
 * If none of the above apply (e.g. desktop browser that doesn't
 * support PWA install) the card hides itself entirely — there's
 * nothing useful to show, and "you can't install this" copy reads as
 * a bug rather than a feature.
 */

import { useState } from "react";
import { CheckCircle2, Download, Share, Smartphone } from "lucide-react";
import { useInstall } from "@/components/providers/InstallProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/uiStore";

export function InstallButton() {
  const { canInstall, isInstalled, isIos, promptInstall } = useInstall();
  const [iosOpen, setIosOpen] = useState(false);

  /* Hide the card on platforms where there's no install path at all
     (e.g. desktop Firefox, no beforeinstallprompt + not iOS). */
  if (!isInstalled && !canInstall && !isIos) return null;

  const onClickInstall = async () => {
    if (isInstalled) return;
    if (isIos) {
      setIosOpen(true);
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Credibly installed.");
    } else if (outcome === "unavailable") {
      /* This can happen if the browser already fired the prompt and the
         user dismissed it — there's no way to re-fire programmatically.
         Best UX: show iOS-style instructions as a fallback. */
      toast.error("Use your browser's menu → 'Install app' to add Credibly.");
    }
  };

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <div
          className={
            isInstalled
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-jade-500/15"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-blue"
          }
        >
          {isInstalled ? (
            <CheckCircle2 className="h-5 w-5 text-jade-300" />
          ) : (
            <Download className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            {isInstalled ? "Credibly is installed" : "Install Credibly"}
          </p>
          <p className="text-xs text-white/55">
            {isInstalled
              ? "You're using the installed app — enjoy the home-screen launch experience."
              : isIos
                ? "Add Credibly to your iPhone home screen for app-like access."
                : "Add Credibly to your device for an app-like launch experience."}
          </p>
        </div>
        {!isInstalled && (
          <Button
            size="sm"
            onClick={onClickInstall}
            leftIcon={
              isIos ? (
                <Smartphone className="h-3.5 w-3.5" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )
            }
          >
            {isIos ? "How to install" : "Install"}
          </Button>
        )}
      </Card>

      {/* iOS instructions — Add to Home Screen flow */}
      <Modal
        open={iosOpen}
        onClose={() => setIosOpen(false)}
        title="Install on iPhone"
        description="iOS requires a couple of taps from Safari's Share menu."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
              1
            </span>
            <span>
              Make sure you&apos;re using <strong>Safari</strong> (not
              Chrome or another in-app browser).
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
              2
            </span>
            <span className="flex flex-wrap items-center gap-1.5">
              Tap the
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
                <Share className="h-3 w-3" />
                Share
              </span>
              button at the bottom of the screen.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
              3
            </span>
            <span>
              Scroll down and tap{" "}
              <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
              4
            </span>
            <span>
              Tap <strong>Add</strong> in the top-right corner. The Credibly
              icon appears on your home screen.
            </span>
          </li>
        </ol>
      </Modal>
    </>
  );
}
