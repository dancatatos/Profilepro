"use client";

/**
 * Manual "Install App" card — drop-in for any settings/profile page.
 *
 * The previous version hid itself when the browser hadn't fired
 * `beforeinstallprompt` yet (e.g. Chrome before the engagement
 * heuristic kicks in). That left mobile Android users with no visible
 * install path even though their browser fully supports PWA install.
 *
 * New behaviour: the card is always visible when the app isn't already
 * installed. It adapts what happens on click based on what the device
 * actually supports:
 *
 *   - iOS Safari → 4-step Add to Home Screen modal
 *   - Android Chrome (event fired) → native install prompt
 *   - Android Chrome (event NOT fired yet) → "Open Chrome menu →
 *     Install app" instructions modal
 *   - Desktop with event → native prompt
 *   - Desktop without event → "Look for the install icon in the address
 *     bar" instructions modal
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Download, MoreVertical, Share, Smartphone } from "lucide-react";
import { useInstall } from "@/components/providers/InstallProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/uiStore";

type Platform = "ios" | "android" | "desktop";

export function InstallButton() {
  const { canInstall, isInstalled, isIos, promptInstall } = useInstall();
  const [openModal, setOpenModal] = useState<Platform | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsAndroid(/Android/i.test(navigator.userAgent || ""));
  }, []);

  /* Already installed → render a confirmation tile that stays visible
     so the user knows the install actually took. */
  if (isInstalled) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-jade-500/15">
          <CheckCircle2 className="h-5 w-5 text-jade-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Credibly is installed
          </p>
          <p className="text-xs text-white/55">
            You&apos;re using the installed app — enjoy the home-screen launch
            experience.
          </p>
        </div>
      </Card>
    );
  }

  const platform: Platform = isIos
    ? "ios"
    : isAndroid
      ? "android"
      : "desktop";

  const onClickInstall = async () => {
    /* If we have a native prompt available, USE IT regardless of
       platform detection — that's always the best UX. */
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("Credibly installed.");
        return;
      }
      if (outcome === "dismissed") {
        /* User said no this time — leave them an instructions path
           to come back to. */
        toast.error("You can install anytime from this button.");
        return;
      }
      /* "unavailable" — fall through to instructions modal. */
    }
    /* No native prompt → open platform-specific instructions. */
    setOpenModal(platform);
  };

  const subtitleByPlatform: Record<Platform, string> = {
    ios: "Add Credibly to your iPhone home screen for app-like access.",
    android:
      "Install Credibly on your Android home screen for app-like access.",
    desktop: "Install Credibly on your computer for a dedicated app window.",
  };

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-blue">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Install Credibly</p>
          <p className="text-xs text-white/55">{subtitleByPlatform[platform]}</p>
        </div>
        <Button
          size="sm"
          onClick={onClickInstall}
          leftIcon={
            platform === "ios" ? (
              <Smartphone className="h-3.5 w-3.5" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )
          }
        >
          {canInstall ? "Install" : "How to install"}
        </Button>
      </Card>

      {/* iOS Safari instructions */}
      <Modal
        open={openModal === "ios"}
        onClose={() => setOpenModal(null)}
        title="Install on iPhone"
        description="iOS requires a couple of taps from Safari's Share menu."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <StepRow n={1}>
            Make sure you&apos;re using <strong>Safari</strong> (not Chrome
            or another in-app browser like Facebook&apos;s).
          </StepRow>
          <StepRow n={2}>
            <span className="flex flex-wrap items-center gap-1.5">
              Tap the
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
                <Share className="h-3 w-3" />
                Share
              </span>
              button at the bottom of the screen.
            </span>
          </StepRow>
          <StepRow n={3}>
            Scroll down and tap{" "}
            <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </StepRow>
          <StepRow n={4}>
            Tap <strong>Add</strong> in the top-right. The Credibly icon
            appears on your home screen.
          </StepRow>
        </ol>
      </Modal>

      {/* Android Chrome instructions (fallback when no prompt event) */}
      <Modal
        open={openModal === "android"}
        onClose={() => setOpenModal(null)}
        title="Install on Android"
        description="Use Chrome's menu to add Credibly to your home screen."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <StepRow n={1}>
            Make sure you&apos;re in <strong>Chrome</strong> (not Facebook,
            Messenger or Instagram&apos;s in-app browser — those can&apos;t
            install apps).
          </StepRow>
          <StepRow n={2}>
            <span className="flex flex-wrap items-center gap-1.5">
              Tap the
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
                <MoreVertical className="h-3 w-3" />
              </span>
              menu in the top-right corner.
            </span>
          </StepRow>
          <StepRow n={3}>
            Tap <strong>&ldquo;Install app&rdquo;</strong> (or sometimes
            <strong> &ldquo;Add to Home screen&rdquo;</strong>).
          </StepRow>
          <StepRow n={4}>
            Confirm <strong>Install</strong>. Credibly appears on your home
            screen and launches in full-screen.
          </StepRow>
        </ol>
      </Modal>

      {/* Desktop fallback */}
      <Modal
        open={openModal === "desktop"}
        onClose={() => setOpenModal(null)}
        title="Install on desktop"
        description="Most modern browsers let you install Credibly as a desktop app."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <StepRow n={1}>
            In <strong>Chrome</strong> or <strong>Edge</strong>, look for the
            <span className="mx-1 inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
              <Download className="h-3 w-3" />
              install
            </span>
            icon at the right end of the address bar.
          </StepRow>
          <StepRow n={2}>
            If you don&apos;t see it, open the browser menu (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
              <MoreVertical className="h-3 w-3" />
            </span>
            ) → look for <strong>&ldquo;Install Credibly&rdquo;</strong> or
            <strong> &ldquo;Apps&rdquo; → &ldquo;Install this site as an
            app&rdquo;</strong>.
          </StepRow>
          <StepRow n={3}>
            Confirm <strong>Install</strong>. Credibly opens in its own
            window like a native app and gets a shortcut on your desktop.
          </StepRow>
        </ol>
      </Modal>
    </>
  );
}

/** Numbered step row used inside every install-instructions modal. */
function StepRow({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-electric-500/15 text-xs font-bold text-electric-300">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
