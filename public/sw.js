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
const VERSION = "credibly-v3";
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

/* ---- Push notifications (architecture-ready) ---- */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Credibly", {
      body: data.body || "You have a new update.",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { url: data.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(self.clients.openWindow(target));
});
