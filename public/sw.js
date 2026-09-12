/*
 * FieldPulse service worker.
 *
 * Deliberately hand-written rather than generated: later phases hang real
 * behaviour off this file — an IndexedDB queue that replays check-ins made
 * offline, web push, and (Android only) Notification Triggers for reminders
 * that fire with no connectivity. See the implementation plan, Phases 1 & 4.
 *
 * Bump CACHE_VERSION whenever the precached shell changes.
 */
const CACHE_VERSION = "v1";
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

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
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
