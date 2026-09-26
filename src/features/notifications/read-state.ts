"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { FieldNotification } from "./types";

export interface ReadState {
  ids: string[];
  before: number;
}

const KEY = "fieldpulse:notifications:read";
const EMPTY: ReadState = { ids: [], before: 0 };

function load(): ReadState {
  try {
    const held = window.localStorage.getItem(KEY);
    if (!held) return EMPTY;

    const parsed = JSON.parse(held) as Partial<ReadState>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids : [],
      before: typeof parsed.before === "number" ? parsed.before : 0,
    };
  } catch {
    // Private browsing, cleared site data, or something else wrote the key.
    return EMPTY;
  }
}

function save(state: ReadState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Read state is a convenience; losing it costs a blue dot, not a visit.
  }
}

export const isRead = (state: ReadState, notification: FieldNotification): boolean =>
  new Date(notification.at).getTime() <= state.before || state.ids.includes(notification.id);

const listeners = new Set<() => void>();
let snapshot: ReadState | null = null;

function subscribe(listener: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    snapshot = null;
    for (const held of listeners) held();
  };

  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener("storage", onStorage);
  };
}

const read = (): ReadState => (snapshot ??= load());

const readOnServer = (): ReadState => EMPTY;

function write(next: ReadState): void {
  snapshot = next;
  save(next);
  for (const listener of listeners) listener();
}

export function useReadState() {
  const state = useSyncExternalStore(subscribe, read, readOnServer);

  return {
    state,
    markRead: useCallback(
      (id: string) => {
        const held = read();
        if (held.ids.includes(id)) return;
        write({ ...held, ids: [...held.ids, id] });
      },
      [],
    ),
    markAllRead: useCallback(() => write({ ids: [], before: Date.now() }), []),
  };
}
