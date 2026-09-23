"use client";

import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/session";

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ManagerTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, signOut } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-sidebar-border bg-sidebar-bg px-4 lg:px-6">
      <button
        type="button"
        aria-label="Open menu"
        onClick={onOpenSidebar}
        className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-hover-bg lg:hidden"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <div className="hidden flex-1 lg:block" />

      {user && (
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sidebar-hover-bg"
          >
            {user.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                className="size-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-active-bg text-sm font-medium text-sidebar-active-foreground">
                {initials(user.firstName, user.lastName)}
              </span>
            )}
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-medium text-sidebar-foreground">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs text-sidebar-section-label">Field manager</span>
            </span>
            <ChevronDown className="size-4 text-sidebar-section-label" aria-hidden />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-40 rounded-lg border border-sidebar-border bg-surface p-1 shadow-lg">
              <Button
                variant="secondary"
                onClick={signOut}
                className="min-h-9 w-full text-left text-sm"
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
