"use client";

import { useMemo, useState } from "react";
import { useReminderSchedule } from "@/features/reminders/hooks";
import { useMyVisits } from "@/features/visits/hooks";
import { useSession } from "@/lib/session";
import { buildFeed, rangeStart, type FieldNotification, type NotificationRange } from "./types";

export function useNotifications(range: NotificationRange): {
  notifications: FieldNotification[];
  isPending: boolean;
  isError: boolean;
} {
  const [now] = useState(() => new Date());
  const { user } = useSession();

  const period = useMemo(() => {
    const from = rangeStart(range, now);
    const to = new Date(now);
    to.setHours(0, 0, 0, 0);
    to.setDate(to.getDate() + 1);

    return { from: from.toISOString(), to: to.toISOString() };
  }, [range, now]);

  const visits = useMyVisits({ ...period, pageSize: 100 });
  const reminders = useReminderSchedule();

  const notifications = useMemo(() => {
    const feed = buildFeed({
      reminders: reminders.data ?? [],
      visits: visits.data?.visits ?? [],
      repId: user?.id,
      now,
    });

    const opens = new Date(period.from).getTime();
    return feed.filter((item) => new Date(item.at).getTime() >= opens);
  }, [reminders.data, visits.data, user?.id, now, period.from]);

  return {
    notifications,
    isPending: visits.isPending || reminders.isPending,
    isError: visits.isError,
  };
}
