"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight, Route } from "lucide-react";
import { MemberAvatars } from "@/components/ui/member-avatars";
import { Modal } from "@/components/ui/modal";
import { RemindersPanel } from "@/features/reminders/components/reminders-panel";
import { useReminderSchedule } from "@/features/reminders/hooks";
import { overdueReminders } from "@/features/reminders/types";
import { useSession } from "@/lib/session";
import { useMyVisits, useQueueFlush } from "../hooks";
import type { Visit } from "../types";
import {
  DAY_NAMES,
  STATUS_LABEL,
  STATUS_TONE,
  driveLabel,
  partnersOf,
  plannedDays,
  visitsByDay,
  weekStartOf,
  weekWindow,
} from "../week";
import { PendingActionsBanner } from "./pending-actions-banner";

function todayIndex(weekStart: Date): number | null {
  const today = new Date();
  const day = Math.round(
    (Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) -
      weekStart.getTime()) /
      86_400_000,
  );
  return day >= 0 && day < DAY_NAMES.length ? day : null;
}

export function MyWeekScreen() {
  const { user } = useSession();
  const weekStart = useMemo(() => weekStartOf(), []);
  const [selected, setSelected] = useState(() => todayIndex(weekStart) ?? 0);
  const [remindersOpen, setRemindersOpen] = useState(false);

  // Replays anything recorded offline as soon as this screen mounts, and
  // again whenever the connection returns.
  useQueueFlush();

  const { data, isPending, isError } = useMyVisits({ ...weekWindow(weekStart), pageSize: 100 });
  const reminders = useReminderSchedule();

  const days = useMemo(() => visitsByDay(data?.visits ?? [], weekStart), [data, weekStart]);
  const stops = days[selected] ?? [];
  const routes = plannedDays(days);

  const partners = partnersOf(stops, user?.id);
  const due = overdueReminders(reminders.data ?? []).length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 text-center">
          <h1 className="text-lg font-semibold tracking-tight">This Week</h1>
          <p className="text-sm text-muted">
            {routes} {routes === 1 ? "route" : "routes"} planned
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRemindersOpen(true)}
          aria-label={due ? `Reminders, ${due} due` : "Reminders"}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
        >
          <Bell size={18} aria-hidden />
          {due > 0 && (
            <span
              aria-hidden
              className="absolute top-2 right-2 size-2 rounded-full bg-danger ring-2 ring-surface"
            />
          )}
        </button>
      </header>

      <PendingActionsBanner />

      <div className="mt-6 grid grid-cols-5 gap-2">
        {DAY_NAMES.map((name, dayIndex) => {
          const count = days[dayIndex]?.length ?? 0;
          const active = dayIndex === selected;

          return (
            <button
              key={name}
              type="button"
              onClick={() => setSelected(dayIndex)}
              aria-pressed={active}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="text-xs text-muted">{name}</span>
              <span
                className={`flex w-full flex-col items-center rounded-2xl border px-1 py-3 ${
                  active
                    ? "border-sidebar-active-bg bg-sidebar-active-bg text-sidebar-active-foreground"
                    : "border-border bg-surface"
                }`}
              >
                <span className="text-lg font-semibold tabular-nums">{count}</span>
                <span className={`text-[11px] ${active ? "" : "text-muted"}`}>
                  {count === 1 ? "Visit" : "Visits"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <section className="mt-5 rounded-2xl bg-sidebar-active-bg p-5 text-sidebar-active-foreground">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xl font-semibold">
            {stops.length} {stops.length === 1 ? "visit" : "visits"}
          </p>
          <Route size={20} aria-hidden className="shrink-0 opacity-70" />
        </div>

        <p className="mt-2 text-sm opacity-70">
          {stops.length === 0
            ? "Nothing planned for this day."
            : partners.length
              ? `with ${partners
                  .map((member) => `${member.user.firstName} ${member.user.lastName}`.trim())
                  .join(" & ")}`
              : "On your own today."}
        </p>
      </section>

      <h2 className="mt-7 text-sm font-medium text-muted">My Routes</h2>

      {isPending && <p className="mt-3 text-sm text-muted">Loading…</p>}

      {isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Could not load your week.
        </p>
      )}

      {data && stops.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No calls planned for {DAY_NAMES[selected]}.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {stops.map((visit, position) => (
          <RouteCard key={visit.id} visit={visit} position={position} selfId={user?.id} />
        ))}
      </ul>

      {remindersOpen && (
        <Modal
          onClose={() => setRemindersOpen(false)}
          label="Reminders"
          header={<h2 className="text-lg font-semibold tracking-tight">Reminders</h2>}
        >
          <RemindersPanel />
        </Modal>
      )}
    </main>
  );
}

function RouteCard({
  visit,
  position,
  selfId,
}: {
  visit: Visit;
  position: number;
  selfId: string | undefined;
}) {
  const drive = driveLabel(visit, position);
  const partners = (visit.pair?.members ?? []).filter((member) => member.user.id !== selfId);

  return (
    <li>
      <Link
        href={`/visits/${visit.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">{visit.lead.companyName}</span>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-xs/none font-medium ${STATUS_TONE[visit.status]}`}
            >
              {STATUS_LABEL[visit.status]}
            </span>
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
            {visit.lead.address && <span className="truncate">{visit.lead.address}</span>}
            {visit.lead.address && drive && <span aria-hidden>•</span>}
            {drive && <span className="shrink-0">{drive}</span>}
          </span>

          <span className="mt-2 flex items-center gap-2">
            <MemberAvatars users={(visit.pair?.members ?? []).map((member) => member.user)} />
            <span className="truncate text-sm text-muted">
              You{partners.length ? ` & ${partners.map((m) => m.user.firstName).join(" & ")}` : ""}
            </span>
          </span>
        </span>

        <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}
