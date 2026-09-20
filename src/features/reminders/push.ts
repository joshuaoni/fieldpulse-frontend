import { fetchVapidKey, registerDevice } from "./api";

/**
 * A VAPID key travels as base64url and the browser wants raw bytes.
 */
function decodeKey(base64Url: string): ArrayBuffer {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

  const bytes = new ArrayBuffer(binary.length);
  const view = new Uint8Array(bytes);
  for (let index = 0; index < binary.length; index++) view[index] = binary.charCodeAt(index);
  return bytes;
}

const encodeKey = (buffer: ArrayBuffer | null): string =>
  buffer
    ? btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
    : "";

export type PushSetupResult =
  "subscribed" | "unsupported" | "denied" | "not-configured" | "no-worker" | "failed";

const WORKER_TIMEOUT_MS = 5_000;

class NoServiceWorker extends Error {}

function readyWorker(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const expiry = setTimeout(() => reject(new NoServiceWorker()), WORKER_TIMEOUT_MS);
    navigator.serviceWorker.ready.then(
      (registration) => {
        clearTimeout(expiry);
        resolve(registration);
      },
      (error) => {
        clearTimeout(expiry);
        reject(error);
      },
    );
  });
}

export const pushIsSupported = (): boolean =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

/**
 * Registers this browser for push, if it can be and the rep allows it.
 *
 * On iOS this only works at all once the app has been added to the home
 * screen: Safari delivers push to installed PWAs and nothing else. 
 */
export async function enablePush(): Promise<PushSetupResult> {
  if (!pushIsSupported()) return "unsupported";

  const publicKey = await fetchVapidKey().catch(() => "");
  if (!publicKey) return "not-configured";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const registration = await readyWorker();

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      }));

    await registerDevice({
      endpoint: subscription.endpoint,
      p256dh: encodeKey(subscription.getKey("p256dh")),
      auth: encodeKey(subscription.getKey("auth")),
    });

    return "subscribed";
  } catch (error) {
    return error instanceof NoServiceWorker ? "no-worker" : "failed";
  }
}

/** Whether this browser is already registered, without prompting for anything. */
export async function pushAlreadyEnabled(): Promise<boolean> {
  if (!pushIsSupported() || Notification.permission !== "granted") return false;

  try {
    const registration = await readyWorker();
    return Boolean(await registration.pushManager.getSubscription());
  } catch {
    return false;
  }
}
