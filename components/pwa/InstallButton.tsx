"use client";

/**
 * Manual "Install App" card — drop-in for any settings/profile page.
 *
 * The previous version handled only three buckets (ios / android /
 * desktop), which left Huawei phones, iPads (which UA-spoof as macOS),
 * in-app browsers (Messenger / Facebook / Instagram / TikTok) and
 * desktop Safari / Firefox users with no working install path. The
 * "Install" button just spun forever on those devices.
 *
 * Behaviour now:
 *
 *   inapp     → "Open in your real browser first" with a Copy URL
 *               button + a tap-to-open chip per major host. Most
 *               critical fix — these users CANNOT install from the
 *               in-app webview, period.
 *   ios       → 4-step Safari Share → Add to Home Screen modal
 *   ipados    → same Share-menu flow (iPadOS hides as macOS Safari)
 *   android   → native install prompt where the event fired, otherwise
 *               Chrome 3-dot-menu instructions
 *   huawei    → HUAWEI Browser 3-dot-menu → Add to home screen, plus
 *               an "open in Chrome via Petal Search" fallback
 *   safari    → File → Add to Dock (macOS Sonoma+)
 *   firefox   → Honest "Firefox doesn't install PWAs — try Chrome or
 *               bookmark" message so users don't keep spinning
 *   desktop   → Chrome / Edge install icon in the address bar
 */

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MoreVertical,
  Share,
  Smartphone,
} from "lucide-react";
import { useInstall } from "@/components/providers/InstallProvider";
import type { InstallPlatform } from "@/components/providers/InstallProvider";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { copyToClipboard, getAppOrigin } from "@/lib/utils";
import { toast } from "@/store/uiStore";

export function InstallButton() {
  const {
    /* canInstall deliberately NOT destructured — every install button
       is always tappable now. The browser's "is the prompt available"
       check happens INSIDE promptInstall(); the user gets a clear
       toast either way rather than a silently-hidden button. */
    isInstalled,
    inAppName,
    platform,
    wasInstalledBefore,
    installPending,
    promptInstall,
    cancelPending,
  } = useInstall();
  const [openModal, setOpenModal] = useState<InstallPlatform | null>(null);
  /* Tracks whether we've already attempted the native prompt on
     platforms where the API is unreliable (Huawei especially). If a
     first attempt resolved as "unavailable" we skip straight to the
     instructions modal next time so the user isn't stuck in a loop. */
  const [promptFailed, setPromptFailed] = useState(false);

  /* Pending state lasts until the browser fires beforeinstallprompt OR
     the user cancels. We aggressively timeout at 5s now (was 30s) so
     users on phones where the event never fires aren't stuck staring
     at a spinner — they get routed to the always-works manual steps
     fast. */
  useEffect(() => {
    if (!installPending) return;
    const timeoutId = setTimeout(() => {
      cancelPending();
      setOpenModal(platform);
    }, 5_000);
    return () => clearTimeout(timeoutId);
  }, [installPending, cancelPending, platform]);

  /* NOTE: We deliberately do NOT short-circuit when isInstalled is true.
     The browser's "already installed" detection is unreliable — it can
     report installed when the user has uninstalled and wants to redo it,
     or when they're trying to install on a second device. Users
     reported being locked out of the install button entirely on phones
     where the detection misfires. We now always render the install
     option and just show a small "currently installed" badge for
     context. If they install twice, they can uninstall the duplicate. */

  /**
   * Try the native browser prompt — used as a SHORTCUT inside each
   * instructions modal, not as the primary path anymore.
   *
   * IMPORTANT: This is now always attempted regardless of canInstall.
   * The browser's "already installed" check is at the platform level
   * and we can't bypass it from JavaScript — what we CAN do is always
   * give the user something to tap and give crystal-clear guidance
   * when the platform suppresses the prompt. Calling prompt() when
   * no event is available is harmless (just resolves to "unavailable")
   * — letting the user trigger it themselves removes any "stuck
   * button" feeling.
   */
  const tryNativePrompt = async (): Promise<boolean> => {
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      toast.success("Credibly installed!");
      setOpenModal(null);
      return true;
    }
    if (outcome === "dismissed") {
      toast.error("Install cancelled — you can try again anytime.");
      return false;
    }
    if (outcome === "queued") {
      toast.success("Preparing install — keep this page open.");
      return false;
    }
    /* "unavailable" → Chrome refused. Most common cause is "app
       is already installed on this phone" (Chrome won't fire the
       prompt twice for the same device). Tell the user exactly
       what's happening so they're not confused, and highlight the
       reinstall path. */
    setPromptFailed(true);
    toast.error(
      "Chrome won't install — likely already on your phone. Long-press the existing Credibly icon → Uninstall, then try again.",
    );
    return false;
  };

  /**
   * The main "Install" button handler. Always opens the instructions
   * modal for the current platform — this is the new always-works
   * default. We deliberately skip the native prompt attempt here even
   * when it could succeed; users tap a button inside the modal to
   * trigger it as an explicit shortcut. The previous "try native first
   * then fall back" flow was the source of the install-stuck bugs.
   */
  const onClickInstall = () => {
    setOpenModal(platform);
  };

  /* Cancel a pending install when the user clicks the button again
     (so the spinner doesn't trap them). */
  const onClickWhilePending = () => {
    cancelPending();
    toast.success("Install cancelled.");
  };

  const subtitleByPlatform: Record<InstallPlatform, string> = {
    inapp: `${inAppName || "This in-app browser"} can't install apps — open Credibly in your browser to continue.`,
    ios: "Add Credibly to your iPhone home screen for app-like access.",
    ipados: "Add Credibly to your iPad home screen for app-like access.",
    android: wasInstalledBefore
      ? "Welcome back — reinstall Credibly on your home screen."
      : "Install Credibly on your Android home screen for app-like access.",
    huawei: wasInstalledBefore
      ? "Welcome back — reinstall Credibly on your HUAWEI home screen."
      : "Install Credibly on your HUAWEI device for app-like access.",
    safari: "Add Credibly to your Dock from Safari's File menu.",
    firefox:
      "Firefox doesn't install PWAs — open in Chrome or Edge to install, or bookmark this page.",
    desktop: wasInstalledBefore
      ? "Welcome back — reinstall the Credibly desktop app."
      : "Install Credibly on your computer for a dedicated app window.",
    unknown:
      "Your browser doesn't expose an install button — try Chrome, Edge or Safari.",
  };

  /* Title morphs slightly when we know the user previously had it
     installed — feels personal instead of generic. The in-app case
     gets its own urgent title so the user notices it's a blocker. */
  const title =
    platform === "inapp"
      ? "Open in your browser to install"
      : wasInstalledBefore
        ? "Reinstall Credibly"
        : "Install Credibly";

  const ButtonIcon =
    platform === "inapp"
      ? Compass
      : platform === "ios" || platform === "ipados"
        ? Smartphone
        : Download;

  /* Now that every tap opens the instructions modal first (which can
     offer a native-install shortcut inside), the label is consistent
     across platforms — "Install" everywhere except in-app browsers
     which need a different verb because they CAN'T install at all. */
  const ctaLabel = platform === "inapp" ? "Show me how" : "Install";

  return (
    <>
      <Card className="flex items-center gap-3 p-4">
        <div
          className={
            platform === "inapp"
              ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15"
              : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-blue"
          }
        >
          {platform === "inapp" ? (
            <AlertCircle className="h-5 w-5 text-amber-300" />
          ) : (
            <Download className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-white">{title}</p>
            {/* Soft indicator when the browser thinks it's already
                installed — kept inline so the install button is still
                available (some browsers misreport this; users may also
                want to reinstall on a new device or after uninstalling). */}
            {isInstalled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-jade-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-jade-300">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Already on this device
              </span>
            )}
          </div>
          <p className="text-xs text-white/55">
            {installPending
              ? "Preparing install — interact with the page for a moment if it doesn't pop up."
              : isInstalled
                ? "Looking to reinstall? Long-press the existing icon on your home screen → Uninstall, then tap Install below."
                : subtitleByPlatform[platform]}
          </p>
        </div>
        {installPending ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onClickWhilePending}
            leftIcon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}
          >
            Cancel
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={onClickInstall}
            leftIcon={<ButtonIcon className="h-3.5 w-3.5" />}
          >
            {ctaLabel}
          </Button>
        )}
      </Card>

      {/* In-app browser — open in real browser first */}
      <InAppBrowserModal
        open={openModal === "inapp"}
        host={inAppName}
        onClose={() => setOpenModal(null)}
      />

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

      {/* iPad — same Share-menu flow, position copy is different */}
      <Modal
        open={openModal === "ipados"}
        onClose={() => setOpenModal(null)}
        title="Install on iPad"
        description="iPadOS uses Safari's Share menu — same as iPhone."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <StepRow n={1}>
            Make sure you&apos;re using <strong>Safari</strong> (not Chrome
            or another in-app browser).
          </StepRow>
          <StepRow n={2}>
            <span className="flex flex-wrap items-center gap-1.5">
              Tap the
              <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
                <Share className="h-3 w-3" />
                Share
              </span>
              button in the top-right of the address bar.
            </span>
          </StepRow>
          <StepRow n={3}>
            Scroll down and tap{" "}
            <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
          </StepRow>
          <StepRow n={4}>
            Tap <strong>Add</strong>. The Credibly icon lands on your iPad
            home screen.
          </StepRow>
        </ol>
      </Modal>

      {/* Android Chrome instructions (fallback when no prompt event) */}
      <Modal
        open={openModal === "android"}
        onClose={() => setOpenModal(null)}
        title="Install on Android"
        description="Tap to try the native installer, or use Chrome's menu."
      >
        <div className="space-y-3 pb-3">
          {/* ALWAYS-VISIBLE install button. We deliberately do NOT gate
              this on canInstall — the user wants ONE button they can
              tap that "just installs". Calling prompt() with no event
              available is harmless (resolves to "unavailable") and the
              toast tells them exactly what's wrong (most often: the
              app is already on the phone). Removing the gate solves
              the "I tap install but nothing happens / no button shows"
              reports — there's now always something tappable. */}
          <Button
            fullWidth
            onClick={tryNativePrompt}
            disabled={promptFailed}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {promptFailed
              ? "Already tried — use steps below"
              : "Tap to install"}
          </Button>

          <ol className="space-y-3 text-sm text-white/80">
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

          {/* Reinstall tip — covers the case the user originally
              raised: browser says "already installed" but they want
              a fresh install. Spelled out explicitly so they don't
              feel stuck. */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/65">
            <p className="font-medium text-white">
              Don&apos;t see &ldquo;Install app&rdquo;?
            </p>
            <p className="mt-1">
              You may already have Credibly installed. To do a fresh install:
              long-press the existing Credibly icon on your home screen →{" "}
              <strong>Uninstall</strong>, then come back here and try again.
            </p>
          </div>

          {/* Play Protect "unsafe app blocked" tip — happens when
              installing via Samsung Internet or older browsers that
              build WebAPKs with an outdated target SDK. The install
              is safe (it's just the same site), Play Protect just
              can't verify non-Chrome WebAPKs. The user almost always
              misses the small "Install anyway" link above the "Got it"
              button — call it out explicitly. */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-xs text-white/65">
            <p className="font-medium text-amber-200">
              Saw &ldquo;Unsafe app blocked&rdquo; from Play Protect?
            </p>
            <p className="mt-1">
              Tap the gray <strong>&ldquo;Install anyway&rdquo;</strong>{" "}
              text <strong>above</strong> the &ldquo;Got it&rdquo; button —
              it&apos;s a clickable link, not just a label. Credibly is
              the same site you&apos;re already on; Play Protect just
              can&apos;t verify PWAs built by Samsung Internet.
            </p>
            <p className="mt-1 text-amber-200/80">
              <strong>Cleanest install:</strong> use Chrome instead of
              Samsung Internet — no Play Protect warning, faster install.
            </p>
          </div>
        </div>
      </Modal>

      {/* HUAWEI Browser — Chromium fork that mostly doesn't fire the
          install prompt. Modal explains the manual 3-dot menu flow,
          BUT also offers a "Try install anyway" button so users on
          newer HUAWEI Browser builds (which DO sometimes fire the
          event) can install in one tap if it works. Plus a direct
          AppGallery link to download Edge as a guaranteed escape
          hatch — Edge installs PWAs reliably on Huawei. */}
      <Modal
        open={openModal === "huawei"}
        onClose={() => setOpenModal(null)}
        title="Install on HUAWEI"
        description="HUAWEI Browser doesn't show a native install button — use the 3-dot menu, or open in Edge."
      >
        <div className="space-y-3 pb-3">
          {/* Always-visible install button (same approach as Android +
              desktop modals). The few HUAWEI builds that DO fire
              beforeinstallprompt will install in one tap; the rest
              will get the clear "Chrome refused" toast and use the
              manual menu steps below. */}
          <Button
            fullWidth
            onClick={tryNativePrompt}
            disabled={promptFailed}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {promptFailed
              ? "Already tried — use steps below"
              : "Try one-tap install"}
          </Button>

          <ol className="space-y-3 text-sm text-white/80">
            <StepRow n={1}>
              Make sure you&apos;re in <strong>HUAWEI Browser</strong> (the
              blue compass icon) — not Facebook, Messenger or any other
              in-app browser.
            </StepRow>
            <StepRow n={2}>
              <span className="flex flex-wrap items-center gap-1.5">
                Tap the
                <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-xs text-white">
                  <MoreVertical className="h-3 w-3" />
                </span>
                menu at the bottom-right of the browser.
              </span>
            </StepRow>
            <StepRow n={3}>
              Tap <strong>&ldquo;Add to home screen&rdquo;</strong> (sometimes
              shown as <strong>&ldquo;Add shortcut&rdquo;</strong>).
            </StepRow>
            <StepRow n={4}>
              Confirm <strong>Add</strong>. Credibly lands on your home
              screen — tap it like any other app.
            </StepRow>
          </ol>

          {/* Guaranteed escape hatch — Microsoft Edge installs PWAs
              cleanly on HarmonyOS / EMUI and is available on
              AppGallery without Google Play services. Direct
              AppGallery link saves the user from searching. */}
          <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/70">
            <p className="font-medium text-white">
              Steps not working? Use Microsoft Edge.
            </p>
            <p>
              Edge installs PWAs reliably on HUAWEI devices and is on
              AppGallery — no Google Play needed.
            </p>
            <a
              href="https://appgallery.huawei.com/app/C103761023"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-electric-500/40 bg-electric-500/10 px-3 py-2 text-xs font-semibold text-electric-300 no-tap-highlight active:scale-[0.98]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open Microsoft Edge on AppGallery
            </a>
            <p className="pt-1 text-[11px] text-white/40">
              After Edge is installed, open <strong>crediblyai.com</strong>
              {" "}in Edge → 3-dot menu → <strong>Apps → Install this
              site</strong>.
            </p>
          </div>
        </div>
      </Modal>

      {/* Desktop Safari (macOS Sonoma+) */}
      <Modal
        open={openModal === "safari"}
        onClose={() => setOpenModal(null)}
        title="Add Credibly to your Dock"
        description="Safari 17 / macOS Sonoma added 'Add to Dock' — older Safari users should use Chrome or Edge instead."
      >
        <ol className="space-y-3 pb-2 text-sm text-white/80">
          <StepRow n={1}>
            In the macOS menu bar, click <strong>File</strong>.
          </StepRow>
          <StepRow n={2}>
            Choose <strong>&ldquo;Add to Dock…&rdquo;</strong>.
          </StepRow>
          <StepRow n={3}>
            Confirm <strong>Add</strong>. Credibly opens in its own window
            and stays in your Dock like a native Mac app.
          </StepRow>
        </ol>
      </Modal>

      {/* Firefox — be honest, it doesn't install PWAs on desktop or
          iOS. Best alternative: use Chrome / Edge, or bookmark. */}
      <Modal
        open={openModal === "firefox"}
        onClose={() => setOpenModal(null)}
        title="Firefox doesn't install PWAs"
        description="Firefox dropped its install-as-app feature on desktop. Use Chrome / Edge, or bookmark Credibly."
      >
        <div className="space-y-3 pb-2 text-sm text-white/80">
          <p>
            Mozilla removed the install button from Firefox in 2021. The
            quickest workarounds:
          </p>
          <ul className="space-y-2 pl-1 text-sm">
            <li className="flex gap-2">
              <span className="text-electric-300">•</span>
              <span>
                Open Credibly in <strong>Chrome</strong>, <strong>Edge</strong>
                {" "}or <strong>Brave</strong> and use the install icon in
                the address bar.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-electric-300">•</span>
              <span>
                In Firefox, press <strong>Ctrl/Cmd + D</strong> to bookmark
                Credibly so it&apos;s one tap away.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-electric-300">•</span>
              <span>
                On Firefox <strong>Android</strong>: tap the 3-dot menu →
                <strong> &ldquo;Add to Home screen&rdquo;</strong>.
              </span>
            </li>
          </ul>
        </div>
      </Modal>

      {/* Desktop Chrome / Edge fallback */}
      <Modal
        open={openModal === "desktop"}
        onClose={() => setOpenModal(null)}
        title="Install on desktop"
        description="Most modern browsers let you install Credibly as a desktop app."
      >
        <div className="space-y-3 pb-3">
          {/* Always-visible install button (same approach as Android
              modal). Tapping triggers prompt() which either installs
              or surfaces the "already installed / Chrome refused" toast. */}
          <Button
            fullWidth
            onClick={tryNativePrompt}
            disabled={promptFailed}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {promptFailed
              ? "Already tried — use steps below"
              : "Tap to install"}
          </Button>

          <ol className="space-y-3 text-sm text-white/80">
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

          {/* Reinstall tip — desktop equivalent of the mobile tip. */}
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/65">
            <p className="font-medium text-white">
              Don&apos;t see the install option?
            </p>
            <p className="mt-1">
              Credibly may already be installed. In Chrome / Edge go to{" "}
              <strong>chrome://apps</strong> (or{" "}
              <strong>edge://apps</strong>), right-click Credibly →{" "}
              <strong>Remove</strong>, then come back and install fresh.
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ── In-app browser modal ─────────────────────────────────────────── */

/**
 * Most installs that "don't work" on Android are actually users tapping
 * a Credibly link from inside Messenger / Facebook / Instagram. Those
 * are sandboxed webviews — they can't install ANY PWA. Best move is to
 * get the user into their real browser, fast.
 *
 * We give them three options ranked by friction:
 *   1) Copy the link — works everywhere, paste into Chrome
 *   2) "Open in Chrome" via intent URL (Android only) — one tap
 *   3) Show the host-specific "3-dot menu → Open in browser" steps
 */
function InAppBrowserModal({
  open,
  host,
  onClose,
}: {
  open: boolean;
  host: string;
  onClose: () => void;
}) {
  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `${getAppOrigin()}/settings`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied — paste it into Chrome / Safari.");
    } else {
      toast.error("Couldn't copy — long-press the address bar to copy.");
    }
  };

  /* Android intent URL — when tapped from inside a WebView this asks
     the OS to open the link in Chrome rather than the in-app browser.
     Falls back gracefully on iOS (becomes a regular link). */
  const intentHref = (() => {
    if (typeof window === "undefined") return url;
    const clean = url.replace(/^https?:\/\//, "");
    return `intent://${clean}#Intent;scheme=https;package=com.android.chrome;end`;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open in your browser"
      description={
        host
          ? `${host}'s in-app browser can't install apps. Open Credibly in your real browser first.`
          : "This in-app browser can't install apps. Open Credibly in your real browser first."
      }
    >
      <div className="space-y-3 pb-3">
        {/* URL + Copy */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 pl-3">
          <span className="flex-1 truncate text-xs text-white/65">{url}</span>
          <Button size="sm" onClick={copy} leftIcon={<Copy className="h-3.5 w-3.5" />}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        {/* Android: one-tap Chrome intent */}
        <a
          href={intentHref}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 text-sm font-semibold text-white shadow-glow-blue no-tap-highlight active:scale-[0.98]"
        >
          <ExternalLink className="h-4 w-4" />
          Open in Chrome (Android)
        </a>

        {/* Instructions per host so we name the right button */}
        <div className="space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-white/70">
          <p className="font-medium text-white">Or manually:</p>
          {host === "Facebook" || host === "Messenger" ? (
            <p>
              Tap the <MoreVertical className="inline h-3 w-3" /> 3-dot menu
              at the top-right → <strong>&ldquo;Open in external
              browser&rdquo;</strong>.
            </p>
          ) : host === "Instagram" ? (
            <p>
              Tap the <MoreVertical className="inline h-3 w-3" /> 3-dot menu
              at the top-right → <strong>&ldquo;Open in Chrome&rdquo;</strong>
              {" "}or <strong>&ldquo;Open in browser&rdquo;</strong>.
            </p>
          ) : host === "TikTok" ? (
            <p>
              Tap the <MoreVertical className="inline h-3 w-3" /> 3-dot icon
              → <strong>&ldquo;Open in browser&rdquo;</strong>.
            </p>
          ) : host === "LINE" ? (
            <p>
              Tap the <Share className="inline h-3 w-3" /> share icon at the
              bottom → <strong>&ldquo;Open in other app&rdquo;</strong> →
              pick <strong>Chrome</strong> or <strong>Safari</strong>.
            </p>
          ) : (
            <p>
              Look for an <strong>&ldquo;Open in browser&rdquo;</strong>
              {" "}option in this app&apos;s menu, or copy the link above
              and paste it into Chrome / Safari.
            </p>
          )}
        </div>

        <p className="text-[11px] text-white/40">
          Once Credibly is open in your real browser, come back to{" "}
          <strong>Settings → Install Credibly</strong> — the install button
          will work.
        </p>
      </div>
    </Modal>
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
