"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { NavItemConfig } from "./nav-config";
import { MANAGER_NAV } from "./nav-config";

function NavRow({
  item,
  active,
  onNavigate,
}: {
  item: NavItemConfig;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        aria-disabled
        className="flex min-h-11 cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-disabled"
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-sidebar-active-bg text-sidebar-active-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-hover-bg"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {item.label}
    </Link>
  );
}

export function ManagerSidebar({
  isMobile = false,
  onNavigate,
  onClose,
}: {
  isMobile?: boolean;
  onNavigate?: () => void;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={
        isMobile
          ? "flex h-full w-full flex-col bg-sidebar-bg px-3 text-sidebar-foreground"
          : "fixed inset-y-0 left-0 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar-bg px-3 text-sidebar-foreground"
      }
    >
      <div className="flex items-center justify-between border-b border-sidebar-border px-2 py-5">
        <div className="flex items-center gap-2">
          <BrandMark className="size-6" />
          <span className="text-sm font-semibold tracking-tight">FieldPulse</span>
        </div>
        {isMobile && onClose && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-sidebar-foreground hover:bg-sidebar-hover-bg"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <nav className="mt-6 flex-1 overflow-y-auto px-2 pb-6">
        {MANAGER_NAV.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-sidebar-section-label">
              {section.label}
            </p>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavRow
                  key={item.href}
                  item={item}
                  active={pathname === item.href}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
