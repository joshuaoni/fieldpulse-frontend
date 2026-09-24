/*
 * FieldPulse service worker.
 *
 * Deliberately hand-written rather than generated: later phases hang real
 * behaviour off this file — an IndexedDB queue that replays check-ins made
 * offline, web push, and (Android only) Notification Triggers for reminders
 * that fire with no connectivity. See the implementation plan, Phases 1 & 4.
 *
 * Bump CACHE_VERSION whenever the precached shell changes: activate deletes
 * every cache not named by the current version, which is what clears a stale
 * one off a machine that already has it.
 */
const CACHE_VERSION = "v2";
const SHELL_CACHE = `fieldpulse-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fieldpulse-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

const isApiRequest = (url) => url.pathname.startsWith("/api/");

/**
 * Whether built assets may be cached and served forever.
 *
 * A build gives `/_next/static/` content-hashed URLs, so a cached one can
 * never be wrong. A dev server reuses those same paths across rebuilds, so a
 * cached one is wrong the moment anything is edited — the page comes back
 * holding chunks from a previous build and fails to start.
 */
const ASSETS_ARE_IMMUTABLE = !["localhost", "127.0.0.1", "[::1]"].includes(
  self.location.hostname,
);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin || isApiRequest(url)) return;

  // Navigations: network first, so a reachable server always wins; fall back
  // to the cached page, then to the offline screen.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await caches.match(request)) ?? (await caches.match(OFFLINE_URL)) ?? Response.error()
          );
        }
      })(),
    );
    return;
  }

  if (
    ASSETS_ARE_IMMUTABLE &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))
  ) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        const cache = await caches.open(SHELL_CACHE);
        cache.put(request, response.clone());
        return response;
      })(),
    );
  }
});

/* ── Reminders ────────────────────────────────────────────────────────────
 *
 * Two channels reach a rep, and this file owns one of them: a push
 * notification sent by the server, which needs connectivity at the moment it
 * fires. The other is email, which needs nothing from the browser at all.
 */

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "FieldPulse", {
      body: payload.body || "",
      tag: payload.tag || "fieldpulse",
      renotify: Boolean(payload.tag),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      
      for (const client of windows) {
        if (client.url.includes(target) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});
