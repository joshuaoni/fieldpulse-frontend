"use client";

import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { Avatar } from "@/components/ui/member-avatars";
import { useSession } from "@/lib/session";

export function RepAccountMenu({ roleLabel, pending }: { roleLabel: string; pending: number }) {
  const { user, signOut } = useSession();
  const [open, setOpen] = useState(false);

  if (!user) return <div className="min-w-0 flex-1" />;

  return (
    <div
      className="relative min-w-0 flex-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="-mx-2 flex max-w-full items-center gap-3 rounded-xl px-2 py-1 text-left hover:bg-sunken"
      >
        <Avatar user={user} className="size-11 shrink-0" />
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {user.firstName} {user.lastName}
          </span>
          <span className="block truncate text-sm text-muted">{roleLabel}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-border bg-surface p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={pending > 0}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium hover:bg-sunken disabled:opacity-50"
          >
            <LogOut size={16} aria-hidden />
            Sign out
          </button>

          {pending > 0 && (
            <p className="px-3 pt-1 pb-2 text-xs text-muted">
              {pending === 1 ? "1 action is" : `${pending} actions are`} still waiting to sync. Sign
              out once {pending === 1 ? "it has" : "they have"} gone through, or{" "}
              {pending === 1 ? "it" : "they"} would be sent as whoever signs in next.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
