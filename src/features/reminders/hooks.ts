"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReminderSchedule } from "./api";
import type { Reminder } from "./types";

export const reminderKeys = {
  schedule: ["reminders", "schedule"] as const,
};

export function useReminderSchedule(enabled = true) {
  return useQuery<Reminder[]>({
    queryKey: reminderKeys.schedule,
    queryFn: fetchReminderSchedule,
    enabled,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });
}
