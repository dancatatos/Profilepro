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
   * Show the native install prompt. Returns "accepted" / "dismissed"
   * if a prompt was shown, "unavailable" when there's no captured event.
   */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

const InstallContext = createContext<InstallState>({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  promptInstall: async () => "unavailable",
});

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

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
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    /* Display-mode can change at runtime if the user installs while
       the page is open — listen so the button hides itself live. */
    const mq = window.matchMedia("(display-mode: standalone)");
    const onMode = () => checkInstalled();
    mq.addEventListener?.("change", onMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener?.("change", onMode);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  const value = useMemo<InstallState>(
    () => ({
      canInstall: !!deferred,
      isInstalled,
      isIos,
      promptInstall,
    }),
    [deferred, isInstalled, isIos, promptInstall],
  );

  return (
    <InstallContext.Provider value={value}>{children}</InstallContext.Provider>
  );
}

/** Hook to read PWA install state + trigger the native prompt. */
export function useInstall(): InstallState {
  return useContext(InstallContext);
}
