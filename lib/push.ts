/**
 * Web push notification client helpers.
 *
 * Public surface for the user-facing settings toggle. All actual
 * subscription state lives in Firestore (push_subscriptions); the
 * browser's own `serviceWorker.getRegistration().pushManager` is the
 * source of truth for whether THIS device is subscribed.
 *
 * Browser support matrix:
 *   - Chrome / Edge / Firefox desktop: full support
 *   - Chrome / Firefox Android:        full support
 *   - Safari iOS 16.4+:                ONLY when the PWA is installed
 *                                      to the home screen. We surface
 *                                      this requirement via the
 *                                      `getPermissionState` "unsupported"
 *                                      branch.
 */

import {
  deletePushSubscription,
  savePushSubscription,
} from "@/lib/firebase/firestore";

export type PushPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

/**
 * What can the current browser do with push notifications?
 *
 * `unsupported` covers two cases:
 *   1. Browser doesn't expose Notification / PushManager (older Safari,
 *      most in-app browsers like FB / IG)
 *   2. iOS Safari accessed without first installing the PWA — Notification
 *      exists but PushManager isn't available
 */
export function getPushPermissionState(): PushPermissionState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!("PushManager" in window)) return "unsupported";
  return Notification.permission as PushPermissionState;
}

/**
 * Subscribe THIS browser to push and persist the subscription on the
 * server. Idempotent — calling twice with the same endpoint is safe
 * (the server upserts by endpoint hash).
 *
 * Returns a PushSubscription on success, throws on:
 *   - permission denied / dismissed
 *   - missing VAPID public key (env misconfig)
 *   - server rejected the payload
 */
export async function subscribeToPush(
  userId: string,
): Promise<PushSubscription> {
  if (typeof window === "undefined") {
    throw new Error("Push only works in the browser.");
  }
  const state = getPushPermissionState();
  if (state === "unsupported") {
    throw new Error(
      "This browser doesn't support push notifications. On iPhone, install Credibly to your home screen first.",
    );
  }
  /* Ask permission BEFORE registering the subscription — calling
     pushManager.subscribe without permission throws a confusing
     "NotAllowedError" rather than the cleaner explicit prompt. */
  if (state !== "granted") {
    const next = await Notification.requestPermission();
    if (next !== "granted") {
      throw new Error("Permission denied for notifications.");
    }
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error(
      "Push notifications aren't configured yet (missing VAPID key). Try again later.",
    );
  }

  /* The service worker must be active before we can subscribe. The
     register() returns immediately if it's already installed. */
  const registration = await navigator.serviceWorker.ready;

  /* Subscribe with the VAPID public key — the push service (Google /
     Mozilla) uses this to validate that messages came from our
     server, so MITMing the channel isn't possible. */
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    /* The DOM types for applicationServerKey are stricter than the
       Uint8Array we get back from base64 decoding — cast to BufferSource
       to satisfy them. Runtime value is identical. */
    applicationServerKey: urlBase64ToUint8Array(
      vapidPublicKey,
    ) as unknown as BufferSource,
  });

  /* Persist to Firestore so the cron can target this device.
     Firestore rules enforce that userId matches the auth uid, so
     no extra server-side auth check is needed here. */
  try {
    await savePushSubscription(
      userId,
      subscription.toJSON(),
      typeof navigator !== "undefined" ? navigator.userAgent : "",
    );
  } catch (err) {
    /* Roll back the browser subscription so we don't have a phantom
       registration that no server-side push will ever target. */
    await subscription.unsubscribe().catch(() => null);
    throw err;
  }
  return subscription;
}

/**
 * Unsubscribe THIS browser. Best-effort: tries the server first, then
 * the browser. Either step failing doesn't block the other — the user
 * said "stop notifying me" and we want both ends torn down.
 */
export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  /* Remove from Firestore FIRST so the cron stops sending immediately.
     If this fails (network error, etc.) the cron will discover the
     dead endpoint on its next push (410 Gone) and clean it up itself,
     so eventual consistency is fine — the browser side still tears
     down even if Firestore fails. */
  await deletePushSubscription(userId, subscription.endpoint).catch(
    () => null,
  );

  await subscription.unsubscribe().catch(() => null);
}

/** True if THIS browser already has an active push subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("PushManager" in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Convert a base64url-encoded VAPID public key into the byte array
 * `pushManager.subscribe` expects. Web Push uses URL-safe base64
 * (different alphabet from standard base64) so we can't use atob alone.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
