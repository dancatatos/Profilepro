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

interface InstallState {
  /** True when the browser has fired beforeinstallprompt and we have a usable event. */
  canInstall: boolean;
  /** True when the app is already running in standalone / installed mode. */
  isInstalled: boolean;
  /** True when this is an iOS device that requires the manual Share → Add to Home Screen flow. */
  isIos: boolean;
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
  wasInstalledBefore: false,
  installPending: false,
  promptInstall: async () => "unavailable",
  cancelPending: () => {},
});

/** localStorage flag set when `appinstalled` event fires. */
const INSTALLED_BEFORE_KEY = "credibly:was-installed";

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
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

    /* iOS detection — userAgent sniffing is the most reliable signal
       given that there's no proper feature detection for "device that
       needs the Share menu". `MSStream` rule-out keeps old IE/Edge
       on Windows Phone from being mis-classified. */
    const ua = window.navigator.userAgent || "";
    const win = window as unknown as { MSStream?: unknown };
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !win.MSStream);

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

  const value = useMemo<InstallState>(
    () => ({
      canInstall: !!deferred,
      isInstalled,
      isIos,
      wasInstalledBefore,
      installPending,
      promptInstall,
      cancelPending,
    }),
    [
      deferred,
      isInstalled,
      isIos,
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
