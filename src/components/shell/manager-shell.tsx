"use client";

import { useState } from "react";
import { ManagerSidebar } from "./manager-sidebar";
import { ManagerTopbar } from "./manager-topbar";

export function ManagerShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="manager-surface min-h-dvh bg-background">
      <div className="hidden lg:block">
        <ManagerSidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-20 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <ManagerSidebar
              isMobile
              onNavigate={() => setSidebarOpen(false)}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-h-dvh flex-col lg:pl-64">
        <ManagerTopbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
