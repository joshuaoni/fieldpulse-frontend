"use client";

import { usePendingActions } from "../hooks";

/**
 * How many field actions are saved on this device but not yet accepted by the
 * server.
 */
export function PendingActionsBanner() {
  const pending = usePendingActions();
  if (pending === 0) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
    >
      {pending === 1 ? "1 action saved on this device" : `${pending} actions saved on this device`}
      {" — they will sync automatically when you have a connection."}
    </p>
  );
}
