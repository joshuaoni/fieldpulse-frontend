"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useReminderSchedule } from "@/features/reminders/hooks";
import { overdueReminders } from "@/features/reminders/types";

export function NotificationsBell() {
  const reminders = useReminderSchedule();
  const due = overdueReminders(reminders.data ?? []).length;

  return (
    <Link
      href="/notifications"
      aria-label={due ? `Notifications, ${due} due` : "Notifications"}
      className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
    >
      <Bell size={18} aria-hidden />
      {due > 0 && (
        <span
          aria-hidden
          className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface"
        />
      )}
    </Link>
  );
}
