"use client";

/**
 * PWA install state — shared so the bottom banner AND the manual
 * "Install" button on the Settings page can both trigger the native
 * prompt from the same captured event.
 *
 * The browser only fires `beforeinstallprompt` once per page load —
 * if two separate components install listeners, only the first one
 * actually receives the event. So we capture it once at the app root
 * and expose it via context to every consumer.
 *
 * iOS Safari never fires the event because it has no programmatic
 * install API. We detect iOS separately so consumers can show an
 * "Add to Home Screen" instructions modal instead of a no-op button.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Platform-specific install path. We carry this through context so the
 * Install button can show the right instructions modal without each
 * consumer having to re-derive it.
 *
 *   ios       — iPhone / iPod (Safari Share → Add to Home Screen)
 *   ipados    — iPad (same flow as iOS, but UA hides as macOS)
 *   android   — generic Android Chrome
 *   huawei    — HUAWEI Browser (Chromium fork without install prompt)
 *   inapp     — Facebook / Messenger / Instagram / TikTok / Line / etc.
 *               in-app browsers that can't install PWAs at all; user
 *               must open in their system browser first
 *   safari    — desktop Safari (File → Add to Dock on Safari 17+)
 *   firefox   — desktop Firefox (no PWA install support; bookmark)
 *   desktop   — Chrome / Edge / Brave / Arc on desktop
 *   unknown   — fall-back when we can't classify the UA
 */
export type InstallPlatform =
  | "ios"
  | "ipados"
  | "android"
  | "huawei"
  | "inapp"
  | "safari"
  | "firefox"
  | "desktop"
  | "unknown";

interface InstallState {
  /** True when the browser has fired beforeinstallprompt and we have a usable event. */
  canInstall: boolean;
  /** True when the app is already running in standalone / installed mode. */
  isInstalled: boolean;
  /** True when this is an iOS device that requires the manual Share → Add to Home Screen flow. */
  isIos: boolean;
  /** True for iPadOS (which masquerades as macOS but uses the Safari Share menu flow). */
  isIpad: boolean;
  /** True when running inside an in-app browser (Facebook, IG, Messenger, TikTok…) that can't install PWAs. */
  isInApp: boolean;
  /** Name of the detected in-app host (Facebook / Messenger / Instagram / …) — empty string when not in-app. */
  inAppName: string;
  /** Final classified install path for this device + browser. */
  platform: InstallPlatform;
  /**
   * True when this device has installed Credibly before (we recorded the
   * appinstalled event in localStorage) but is NOT currently installed.
   * Suggests the user deleted the app — we surface different copy so
   * they know we recognise them.
   */
  wasInstalledBefore: boolean;
  /**
   * True when the user has clicked "Install" but the browser hasn't yet
   * fired beforeinstallprompt. We auto-fire the prompt as soon as it
   * arrives so they don't have to click twice — meanwhile the button
   * shows a spinner so it doesn't look broken.
   */
  installPending: boolean;
  /**
   * Show the native install prompt. Returns "accepted" / "dismissed"
   * if a prompt was shown, "queued" when no event is available yet
   * (we'll auto-fire when the browser fires beforeinstallprompt),
   * "unavailable" only for platforms that have no install path.
   */
  promptInstall: () => Promise<"accepted" | "dismissed" | "queued" | "unavailable">;
  /** Reset the queued state — used when the user closes the install flow. */
  cancelPending: () => void;
}

const InstallContext = createContext<InstallState>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  isIpad: false,
  isInApp: false,
  inAppName: "",
  platform: "unknown",
  wasInstalledBefore: false,
  installPending: false,
  promptInstall: async () => "unavailable",
  cancelPending: () => {},
});

/* ── UA classifiers ─────────────────────────────────────────────────
   Centralised so the InstallButton + provider stay in sync. Pure
   functions, easy to unit-test if we ever add Jest. */

/** True when running inside an embedded webview (Messenger, FB, IG…). */
export function detectInAppHost(ua: string): string {
  /* These all ship outdated WebViews that can't install PWAs. We name
     them so the install modal can say "Open in Chrome instead of
     Messenger" rather than a generic warning. Patterns are ordered
     from most-specific to most-generic so we report the right host. */
  if (/FBAN|FBAV|FB_IAB|FB4A/i.test(ua)) return "Facebook";
  if (/MessengerForiOS|Messenger\//i.test(ua)) return "Messenger";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/TikTok|musical_ly|Bytedance/i.test(ua)) return "TikTok";
  if (/Line\//i.test(ua)) return "LINE";
  if (/Twitter|TwitterAndroid/i.test(ua)) return "X (Twitter)";
  if (/Snapchat/i.test(ua)) return "Snapchat";
  if (/MicroMessenger|WeChat/i.test(ua)) return "WeChat";
  /* Generic WebView signals — only flag when accompanied by an app
     wrapper so we don't mis-classify Chrome on Android (which has
     "wv" in some flavours). */
  if (/; wv\)/i.test(ua) && /Android/i.test(ua)) return "in-app browser";
  return "";
}

/** True for HUAWEI Browser (Chromium fork that doesn't fire beforeinstallprompt). */
export function detectHuawei(ua: string): boolean {
  /* HUAWEI Browser UA contains "HuaweiBrowser". Petal Search and HMS
     based shells include "HMSCore" / "HMS-Search". Older EMUI shells
     leak "huawei" anywhere in the UA. */
  return /HuaweiBrowser|HMSCore|HMS-Search|HuaweiSearch/i.test(ua);
}

/** True for iPad on iPadOS 13+ that masquerades as macOS Safari. */
export function detectIpad(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  /* Classic iPad — UA still says "iPad" on older devices. */
  if (/iPad/.test(ua)) return true;
  /* iPadOS 13+ — UA reports "Macintosh; Intel Mac OS X" but the
     device has touch support. macOS Macs have maxTouchPoints === 0
     (or === 1 for trackpads). iPads report 5. */
  const nav = navigator as Navigator & { maxTouchPoints?: number };
  const touchPoints = nav.maxTouchPoints ?? 0;
  return /Macintosh/.test(ua) && touchPoints > 1;
}

/** True for desktop Safari (not iOS Safari — that's caught upstream). */
export function detectDesktopSafari(ua: string): boolean {
  /* Safari UA contains "Safari" but NOT "Chrome", "Edg", "OPR" etc.
     Also rule out mobile so iOS doesn't fall through here. */
  return (
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|Edg|OPR|Opera/i.test(ua) &&
    !/Mobile|iPhone|iPad|iPod/i.test(ua)
  );
}

/** True for desktop Firefox (no PWA install support). */
export function detectFirefox(ua: string): boolean {
  return /Firefox|FxiOS/i.test(ua);
}

/** localStorage flag set when `appinstalled` event fires. */
const INSTALLED_BEFORE_KEY = "credibly:was-installed";

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isIpad, setIsIpad] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [inAppName, setInAppName] = useState("");
  const [isHuawei, setIsHuawei] = useState(false);
  const [isSafariDesktop, setIsSafariDesktop] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [wasInstalledBefore, setWasInstalledBefore] = useState(false);
  /* When user clicks Install before the event has arrived, we set this
     to true. The useEffect that listens for beforeinstallprompt then
     auto-fires the prompt the moment Chrome sends the event — saving
     the user a second click. */
  const [installPending, setInstallPending] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    /* Detect already-installed mode (standalone PWA). Two signals:
       - matchMedia for desktop + Android Chrome
       - navigator.standalone for legacy iOS check */
    const checkInstalled = () => {
      const standalone =
        window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone =
        typeof (navigator as unknown as { standalone?: boolean }).standalone === "boolean" &&
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(standalone || iosStandalone));
    };
    checkInstalled();

    /* "Previously installed" flag — read from localStorage. We set it
       when the appinstalled event fires; it persists across delete →
       reinstall flows so we can tailor the reinstall UX. */
    try {
      if (localStorage.getItem(INSTALLED_BEFORE_KEY) === "1") {
        setWasInstalledBefore(true);
      }
    } catch {
      /* private mode / sandbox — silently degrade */
    }

    /* Platform classification.
       - iOS (iPhone / iPod) → Share-menu instructions
       - iPadOS → same flow even though UA pretends to be macOS
       - In-app browsers (Facebook, IG, Messenger, TikTok…) → can't
         install at all; need to open in system browser first
       - HUAWEI Browser → Chromium fork that doesn't fire the prompt
         event; needs its own bespoke 3-dot-menu instructions
       - Desktop Safari / Firefox → no install prompt, special copy
       The `MSStream` rule-out keeps old IE/Edge on Windows Phone
       from being mis-classified as iOS. */
    const ua = window.navigator.userAgent || "";
    const win = window as unknown as { MSStream?: unknown };
    setIsIos(/iPhone|iPod/.test(ua) && !win.MSStream);
    setIsIpad(detectIpad());
    const inApp = detectInAppHost(ua);
    setInAppName(inApp);
    setIsInApp(!!inApp);
    setIsHuawei(detectHuawei(ua));
    setIsAndroid(/Android/i.test(ua));
    setIsSafariDesktop(detectDesktopSafari(ua));
    setIsFirefox(detectFirefox(ua));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
      setInstallPending(false);
      /* Mark "previously installed" so future reinstall flows recognise
         the device — sticks across uninstalls (Chrome doesn't clear
         localStorage when the PWA is removed). */
      try {
        localStorage.setItem(INSTALLED_BEFORE_KEY, "1");
        setWasInstalledBefore(true);
      } catch {
        /* private mode */
      }
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    /* Display-mode can change at runtime if the user installs while
       the page is open — listen so the button hides itself live. */
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMode = () => checkInstalled();
    mq.addEventListener?.("change", onMode);

    /* Best-effort accurate detection via the modern API. Only works on
       Chromium-based browsers with `related_applications` in the
       manifest, but when supported it's more reliable than display-mode
       alone (e.g. catches "installed but launched in regular tab" cases). */
    const nav = navigator as unknown as {
      getInstalledRelatedApps?: () => Promise<unknown[]>;
    };
    if (typeof nav.getInstalledRelatedApps === "function") {
      nav
        .getInstalledRelatedApps()
        .then((apps) => {
          if (apps && apps.length > 0) setIsInstalled(true);
        })
        .catch(() => {
          /* API unavailable / no related_applications in manifest */
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onMode);
    };
  }, []);

  /* When a deferred prompt finally arrives AND we have a pending
     install request from an earlier click, auto-fire the prompt so
     the user doesn't have to click again. This is the core fix for
     "I uninstalled then came back and the button doesn't trigger
     anything immediately" — the click triggers a pending state, and
     within a few seconds of engagement Chrome fires the event and
     we surface the native prompt automatically. */
  useEffect(() => {
    if (!deferred || !installPending) return;
    let cancelled = false;
    (async () => {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* User-gesture window may have expired — fail quietly. */
      }
      if (!cancelled) {
        setDeferred(null);
        setInstallPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deferred, installPending]);

  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "queued" | "unavailable"
  > => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      setInstallPending(false);
      return choice.outcome;
    }
    /* No event captured yet — set the pending flag so the useEffect
       above auto-fires the prompt as soon as the event arrives. The
       button caller shows a "preparing install" state until either
       cancelPending() is called or the event arrives. */
    setInstallPending(true);
    return "queued";
  }, [deferred]);

  const cancelPending = useCallback(() => {
    setInstallPending(false);
  }, []);

  /* Resolve the install platform with a strict priority order:
       in-app browsers FIRST (must be solved before any install path),
       then iPadOS / iOS (no programmatic API),
       then Huawei (Chromium fork without the prompt),
       then generic Android,
       then desktop variants (Safari / Firefox / Chromium).
     `unknown` is the safety net — its modal links to the docs. */
  const platform: InstallPlatform = isInApp
    ? "inapp"
    : isIpad
      ? "ipados"
      : isIos
        ? "ios"
        : isHuawei
          ? "huawei"
          : isAndroid
            ? "android"
            : isFirefox
              ? "firefox"
              : isSafariDesktop
                ? "safari"
                : typeof window !== "undefined"
                  ? "desktop"
                  : "unknown";

  const value = useMemo<InstallState>(
    () => ({
      canInstall: !!deferred,
      isInstalled,
      isIos,
      isIpad,
      isInApp,
      inAppName,
      platform,
      wasInstalledBefore,
      installPending,
      promptInstall,
      cancelPending,
    }),
    [
      deferred,
      isInstalled,
      isIos,
      isIpad,
      isInApp,
      inAppName,
      platform,
      wasInstalledBefore,
      installPending,
      promptInstall,
      cancelPending,
    ],
  );

  return (
    <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
  );
}

/** Hook to read PWA install state + trigger the native prompt. */
export function useInstall(): InstallState {
  return useContext(InstallContext);
}
