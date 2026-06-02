/* ============================================================
   Credibly — Service Worker
   App-shell caching, offline fallback, push-notification ready.
   ============================================================ */

/* IMPORTANT: bump this VERSION on every meaningful sw.js or manifest
   change. The activate handler nukes any cache bucket that doesn't
   start with the current VERSION, so a bump = full cache wipe for
   every existing user on their next page load.

   v3 fixes the "PWA install button doesn't work" bug: the old sw
   precached /manifest.webmanifest, which froze the manifest in the
   browser cache. Chrome kept reading the SVG-only manifest (Chrome
   requires PNG icons to enable install), so beforeinstallprompt
   never fired. v3 drops manifest from precache so it's always
   fetched fresh from the network. */
const VERSION = "credibly-v5";
const STATIC_CACHE = VERSION + "-static";
const OFFLINE_URL = "/offline.html";
/* Manifest deliberately NOT precached — it changes more often than
   the SW does (new icons, theme tweaks, shortcuts) and stale manifest
   = silent install criteria failure on Android Chrome. The icon SVG
   stays because it's referenced from the offline page. */
const PRECACHE = [OFFLINE_URL, "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  /* Web manifest must always come fresh from the network. A stale
     manifest silently breaks PWA install criteria on Android Chrome
     (e.g. when icons change SVG→PNG). Skip the SW entirely so the
     browser asks the server directly. */
  if (url.pathname === "/manifest.webmanifest") return;

  // Navigations: network-only — never serve stale HTML.
  // (HTML references hashed JS bundles, so a stale HTML pins users to an
  // old build forever. Fetch fresh every time; only fall back to the
  // offline page if the network actually fails AND the offline page is
  // in cache. Otherwise let the browser show its default error.)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => {
          return (
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }),
      ),
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/* ---- Push notifications ---- */
/* Receives pushes from /api/cron/daily-followup-push. The cron sends
   a JSON payload { title, body, url, tag }; we render that to the OS
   with the proper icons + a `tag` so multiple sends collapse into a
   single notification on the device. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Credibly";
  const options = {
    body: data.body || "You have a new update.",
    /* Real PNGs now — icon.svg used to be referenced but Android
       Chrome ignores SVG in notifications. icon-192 is required;
       badge appears on Android's status bar at small size. */
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    /* tag collapses replacement: a second push with the same tag
       REPLACES the first in the user's notification tray instead of
       stacking. Stops "you have 3 unread reminders" pile-ups. */
    tag: data.tag || "credibly-default",
    /* Replaces an existing notif with the same tag silently if true.
       We want a re-ping if 24h have passed, so leave false. */
    renotify: false,
    data: { url: data.url || "/pipelines/today" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) ||
    "/pipelines/today";

  /* Focus an existing app window if one is open — feels more native
     than always opening a fresh tab. Falls back to openWindow when
     no client is found. */
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(target).catch(() => null);
            return;
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
