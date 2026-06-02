"use client";

/**
 * Settings → Daily Follow-Up Reminder toggle.
 *
 * Wraps the lib/push.ts helpers so the user can:
 *   1. Enable browser push (asks permission, registers subscription)
 *   2. See current state ("active on this device" / "not enabled")
 *   3. Disable (tears down browser + Firestore subscription)
 *
 * The toggle is per-device — the user has to enable it once per
 * browser/phone they want reminders on. We surface this so the user
 * isn't confused why their phone isn't pinging after enabling on
 * desktop.
 */

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  getPushPermissionState,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from "@/lib/push";
import { toast } from "@/store/uiStore";

export function PushNotificationToggle() {
  const { account } = useAuth();
  const [permission, setPermission] =
    useState<PushPermissionState>("default");
  const [subscribedHere, setSubscribedHere] = useState(false);
  /* `loading` is the initial state-detection; `busy` is during
     subscribe/unsubscribe so the button can show a spinner. */
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /* Detect current state on mount. Cheap — just reads from the SW
     registration; no Firestore round-trip. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = getPushPermissionState();
      const subscribed =
        state === "granted" ? await isPushSubscribed() : false;
      if (cancelled) return;
      setPermission(state);
      setSubscribedHere(subscribed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    if (!account) return;
    setBusy(true);
    try {
      await subscribeToPush(account.uid);
      setPermission("granted");
      setSubscribedHere(true);
      toast.success(
        "Daily reminders enabled — you'll get a push at 9 AM PHT.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't enable.";
      toast.error(msg);
      /* Re-read permission in case the user denied at the OS prompt. */
      setPermission(getPushPermissionState());
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!account) return;
    setBusy(true);
    try {
      await unsubscribeFromPush(account.uid);
      setSubscribedHere(false);
      toast.success("Daily reminders disabled on this device.");
    } catch {
      toast.error("Couldn't disable — please try again.");
    } finally {
      setBusy(false);
    }
  };

  /* Don't render anything during the initial state read — flashing
     "disabled" then "enabled" for half a second is uglier than just
     waiting a beat. */
  if (loading) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
        <p className="text-sm text-white/55">Checking notifications…</p>
      </Card>
    );
  }

  /* "Unsupported" branch — most often iOS Safari without the PWA
     installed, or an in-app browser. Tell the user what they CAN do
     instead of just hiding the feature. */
  if (permission === "unsupported") {
    return (
      <Card className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05]">
          <Smartphone className="h-5 w-5 text-white/40" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Daily follow-up reminders
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            This browser doesn&apos;t support push notifications.
            <strong className="text-white/70">
              {" "}
              On iPhone, install Credibly to your home screen first
            </strong>{" "}
            — then come back here to enable.
          </p>
        </div>
      </Card>
    );
  }

  /* "Denied" branch — they tapped Block on the OS prompt. There's no
     programmatic way to re-ask (Chrome blocks repeated prompts), so
     point them at the URL bar lock icon. */
  if (permission === "denied") {
    return (
      <Card className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
          <BellOff className="h-5 w-5 text-red-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Notifications blocked
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            You previously blocked notifications for this site. To
            re-enable: tap the 🔒 icon in your address bar →
            Notifications → Allow, then refresh the page.
          </p>
        </div>
      </Card>
    );
  }

  /* Subscribed + active state. */
  if (subscribedHere) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-jade-500/15">
          <BellRing className="h-5 w-5 text-jade-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">
            Daily reminders are on
          </p>
          <p className="mt-0.5 text-xs text-white/55">
            You&apos;ll get a push notification at 9 AM PHT when leads
            are due — on this device.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={disable}
          loading={busy}
          disabled={busy}
        >
          Turn off
        </Button>
      </Card>
    );
  }

  /* Default state — not yet subscribed. The CTA is the main action. */
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/15">
        <BellRing className="h-5 w-5 text-electric-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">
          Get daily follow-up reminders
        </p>
        <p className="mt-0.5 text-xs text-white/55">
          Free push notification at 9 AM PHT each day when leads need
          following up. Enable once per device.
        </p>
      </div>
      <Button size="sm" onClick={enable} loading={busy} disabled={busy}>
        Enable
      </Button>
    </Card>
  );
}
