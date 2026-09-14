"use client";

/**
 * A durable queue for field actions recorded without a connection.
 *
 * The requirement it exists for: a check-in recorded offline must survive an
 * app kill, a reboot, and a week in a drawer. That rules out memory, and it
 * rules out localStorage — a check-in carries a camera photo, and only
 * IndexedDB stores a Blob.
 *
 * It is deliberately hand-written rather than layered on TanStack Query's
 * mutation persistence. Three things here need explicit control that a generic
 * mutation cache does not give: Blob payloads, strict replay ordering, and the
 * rule that a queued item records the phone's clock for ordering only and
 * never as the verified time.
 */

const DB_NAME = "fieldpulse";
const DB_VERSION = 1;
const STORE = "outbox";

export type QueuedAction =
  | {
      kind: "check-in";
      visitId: string;
      lat: number;
      lng: number;
      photo: Blob;
      clientLocalAt: string;
    }
  | {
      kind: "check-out";
      visitId: string;
      lat: number;
      lng: number;
      clientLocalAt: string;
    }
  | {
      kind: "report";
      visitId: string;
      notes: string;
      outcome?: string;
      clientLocalAt: string;
    };

export interface QueuedItem {
  id: number;
  action: QueuedAction;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, mode);
    const result = await work(tx.objectStore(STORE));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

const listeners = new Set<() => void>();

/** Subscribe to queue-depth changes, for the pending-actions banner. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

export async function enqueue(action: QueuedAction): Promise<void> {
  await withStore("readwrite", async (store) => {
    await promisify(
      store.add({ action, queuedAt: new Date().toISOString(), attempts: 0 } as Omit<
        QueuedItem,
        "id"
      >),
    );
  });
  notify();
}

export async function listQueued(): Promise<QueuedItem[]> {
  return withStore("readonly", (store) => promisify(store.getAll() as IDBRequest<QueuedItem[]>));
}

export async function count(): Promise<number> {
  return withStore("readonly", (store) => promisify(store.count()));
}

async function remove(id: number): Promise<void> {
  await withStore("readwrite", async (store) => {
    await promisify(store.delete(id));
  });
  notify();
}

async function recordFailure(item: QueuedItem, message: string): Promise<void> {
  await withStore("readwrite", async (store) => {
    await promisify(store.put({ ...item, attempts: item.attempts + 1, lastError: message }));
  });
  notify();
}

/**
 * Replays queued actions oldest-first, stopping at the first one that fails
 * for a reason worth retrying.
 *
 * Order matters: a check-out replayed before its check-in would be refused by
 * the server, so a single failure halts the run rather than skipping ahead.
 */
export async function flush(
  send: (action: QueuedAction) => Promise<"done" | "retry">,
): Promise<{ sent: number; remaining: number }> {
  const items = (await listQueued()).sort((a, b) => a.id - b.id);
  let sent = 0;

  for (const item of items) {
    let outcome: "done" | "retry";
    try {
      outcome = await send(item.action);
    } catch (error) {
      await recordFailure(item, error instanceof Error ? error.message : String(error));
      break;
    }

    if (outcome === "retry") break;
    await remove(item.id);
    sent += 1;
  }

  return { sent, remaining: await count() };
}
