"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PushSetup } from "@/features/reminders/components/push-setup";
import { useNotifications } from "../hooks";
import { isRead, useReadState } from "../read-state";
import { byDay, type FieldNotification, type NotificationRange } from "../types";
import { NotificationFilters } from "./notification-filters";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function NotificationsScreen() {
  const [range, setRange] = useState<NotificationRange>("TODAY");
  const [filtering, setFiltering] = useState(false);
  const { notifications, isPending, isError } = useNotifications(range);
  const { state, markRead, markAllRead } = useReadState();

  const unread = notifications.filter((item) => !isRead(state, item)).length;
  const days = byDay(notifications);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <Link
          href="/today"
          aria-label="Back to today"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sunken"
        >
          <ChevronLeft size={18} aria-hidden />
        </Link>

        <h1 className="flex-1 text-center text-lg font-semibold tracking-tight">Notifications</h1>

        {notifications.length > 0 ? (
          <button
            type="button"
            onClick={() => setFiltering(true)}
            aria-label="Filter by date"
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/Vector.svg" alt="" aria-hidden className="size-5" />
          </button>
        ) : (
          <span className="size-10 shrink-0" aria-hidden />
        )}
      </header>

      <PushSetup />

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Could not load your notifications.
        </p>
      )}

      {!isPending && !notifications.length && <Empty />}

      {days.map((day, position) => (
        <section key={day.label} className={position === 0 ? "mt-6" : "mt-7"}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm text-muted">{day.label}</h2>

            {position === 0 && unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-sm font-medium text-chip-active-edge"
              >
                Mark all as read
              </button>
            )}
          </div>

          <ul className="mt-3 flex flex-col gap-3">
            {day.items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                read={isRead(state, item)}
                onRead={() => markRead(item.id)}
              />
            ))}
          </ul>
        </section>
      ))}

      {filtering && (
        <NotificationFilters
          range={range}
          onChange={setRange}
          onClose={() => setFiltering(false)}
        />
      )}
    </main>
  );
}

function NotificationRow({
  notification,
  read,
  onRead,
}: {
  notification: FieldNotification;
  read: boolean;
  onRead: () => void;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2">
        <span
          aria-hidden
          className={`size-2 shrink-0 rounded-full ${
            read ? "bg-sidebar-section-label" : "bg-chip-active-edge"
          }`}
        />
        <span className="min-w-0 truncate font-medium">{notification.title}</span>
      </span>

      <span className="mt-1.5 block text-sm text-muted">{notification.body}</span>
      <span className="mt-2 block text-right text-xs text-muted">{time(notification.at)}</span>
    </>
  );

  return (
    <li>
      {notification.href ? (
        <Link
          href={notification.href}
          onClick={onRead}
          className="block rounded-xl bg-chip-bg p-4 hover:bg-sunken"
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRead}
          aria-label={read ? undefined : `Mark "${notification.title}" as read`}
          className="block w-full rounded-xl bg-chip-bg p-4 text-left hover:bg-sunken"
        >
          {body}
        </button>
      )}
    </li>
  );
}

function Empty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/Illustrations.svg" alt="" aria-hidden className="w-40 max-w-full" />
      <p className="mt-6 text-sm text-muted">You have no notifications yet.</p>
    </div>
  );
}
