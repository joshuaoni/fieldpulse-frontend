"use client";

import { useEffect } from "react";
import { isProduction } from "@/lib/config";

/**
 * Removes any worker controlling this origin, and everything it has cached.
 */
async function evict() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  if (!("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name)));
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (!isProduction) {
      void evict().catch(() => {
        // Nothing to clean up, or the browser would not let us. 
      });
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // A failed registration costs offline support, not the app.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
