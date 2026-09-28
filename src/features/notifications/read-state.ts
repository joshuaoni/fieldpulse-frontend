"use client";

import { useCallback, useSyncExternalStore } from "react";
import * as storage from "@/lib/local-storage";
import type { FieldNotification } from "./types";

export interface ReadState {
  ids: string[];
  before: number;
}

const KEY = "fieldpulse:notifications:read";
const EMPTY: ReadState = { ids: [], before: 0 };

function load(): ReadState {
  const held = storage.read(KEY);
  if (!held) return EMPTY;

  try {
    const parsed = JSON.parse(held) as Partial<ReadState>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids : [],
      before: typeof parsed.before === "number" ? parsed.before : 0,
    };
  } catch {
    // Something else wrote the key, or it was truncated.
    return EMPTY;
  }
}

export const isRead = (state: ReadState, notification: FieldNotification): boolean =>
  new Date(notification.at).getTime() <= state.before || state.ids.includes(notification.id);

const listeners = new Set<() => void>();
let snapshot: ReadState | null = null;
let unsubscribe: (() => void) | null = null;

function subscribe(listener: () => void): () => void {
  if (!listeners.size) {
    unsubscribe = storage.subscribe(KEY, () => {
      snapshot = null;
      for (const held of listeners) held();
    });
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      unsubscribe?.();
      unsubscribe = null;
    }
  };
}

const current = (): ReadState => (snapshot ??= load());

const onServer = (): ReadState => EMPTY;

function commit(next: ReadState): void {
  snapshot = next;
  storage.write(KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function useReadState() {
  const state = useSyncExternalStore(subscribe, current, onServer);

  return {
    state,
    markRead: useCallback((id: string) => {
      const held = current();
      if (held.ids.includes(id)) return;
      commit({ ...held, ids: [...held.ids, id] });
    }, []),
    markAllRead: useCallback(() => commit({ ids: [], before: Date.now() }), []),
  };
}
