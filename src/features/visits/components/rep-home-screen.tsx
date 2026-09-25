"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Avatar } from "@/components/ui/member-avatars";
import { Modal } from "@/components/ui/modal";
import { useMyFieldRole } from "@/features/field-roles/hooks";
import { RemindersPanel } from "@/features/reminders/components/reminders-panel";
import { useReminderSchedule } from "@/features/reminders/hooks";
import { overdueReminders } from "@/features/reminders/types";
import { useSession } from "@/lib/session";
import { usePendingActions, useMyVisits, useQueueFlush } from "../hooks";
import { myAttendance, type Visit } from "../types";
import { repStatus } from "../week";
import { RouteCard } from "./route-card";

const ROLE_LABEL: Record<string, string> = {
  FIELD_REP: "Sales Rep",
  FIELD_MANAGER: "Field Manager",
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

/** Today, bounded to the day, so the home screen only ever shows today. */
function todayWindow(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { from: start.toISOString(), to: end.toISOString() };
}

type Filter = "ALL" | "VISITED" | "NOT_VISITED";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "VISITED", label: "Visited" },
  { value: "NOT_VISITED", label: "Not Visited" },
];

export function RepHomeScreen() {
  const { user } = useSession();
  const fieldRole = useMyFieldRole();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [remindersOpen, setRemindersOpen] = useState(false);

  // Replays anything recorded offline as soon as this screen mounts, and
  // again whenever the connection returns.
  useQueueFlush();

  const window = useMemo(() => todayWindow(), []);
  const { data, isPending, isError } = useMyVisits({ ...window, pageSize: 100 });
  const reminders = useReminderSchedule();
  const pending = usePendingActions();

  const visits = useMemo(
    () =>
      [...(data?.visits ?? [])].sort(
        (a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity),
      ),
    [data],
  );

  const done = visits.filter((visit) => repStatus(visit, user?.id) === "COMPLETED").length;

  /**
   * The card offers an action, so it has to read this rep's own attendance
   * rather than the visit's status.
   *
   * A visit is CHECKED_IN while *either* of the pair is on site. Going by
   * that offered Check Out to someone whose partner had arrived and who had
   * not — and the check-in screen behind the button disagreed, because it
   * has always gone by the rep's own record.
   */
  const mine = (visit: Visit) => (user ? myAttendance(visit, user.id) : undefined);
  const onSite = visits.find((visit) => {
    const attendance = mine(visit);
    return Boolean(attendance?.checkInAt && !attendance.checkOutAt);
  });
  const next = visits.find((visit) => !mine(visit)?.checkInAt);
  const focus = onSite ?? next ?? null;

  const shown = visits.filter((visit) => {
    if (filter === "ALL") return true;

    const visited = repStatus(visit, user?.id) === "COMPLETED";
    return filter === "VISITED" ? visited : !visited;
  });

  const due = overdueReminders(reminders.data ?? []).length;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        {user && <Avatar user={user} className="size-11" />}

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {user ? `${user.firstName} ${user.lastName}` : ""}
          </p>
          <p className="truncate text-sm text-muted">
            {ROLE_LABEL[fieldRole.data?.fieldRole ?? ""] ?? "Field"}
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

      {pending > 0 && (
        <p role="status" className="mt-4 text-sm text-muted">
          {pending === 1 ? "1 action is" : `${pending} actions are`} waiting to sync.
        </p>
      )}

      <FocusCard visit={focus} live={Boolean(onSite)} />

      <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Today&apos;s Progress</p>
        <p className="mt-1 font-semibold">
          {done} of {visits.length} {visits.length === 1 ? "visit" : "visits"} completed
        </p>

        <div
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={visits.length}
          className="mt-3 h-1.5 rounded-full bg-sunken"
        >
          <div
            className="h-full rounded-full bg-chip-active-edge"
            style={{ width: `${visits.length ? (done / visits.length) * 100 : 0}%` }}
          />
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted">My Visits</h2>
        <Link href="/my-week" className="text-sm font-medium hover:underline">
          View All
        </Link>
      </div>

      <div className="mt-3 flex gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-9 rounded-full px-4 text-sm font-medium ${
              filter === value
                ? "bg-sidebar-active-bg text-sidebar-active-foreground"
                : "border border-border bg-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending && <p className="mt-4 text-sm text-muted">Loading…</p>}

      {isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load today&apos;s calls.
        </p>
      )}

      {data && shown.length === 0 && (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">
          {visits.length === 0
            ? "Nothing planned for today."
            : "Nothing here under that filter."}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {shown.map((visit, position) => (
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

/**
 * The one thing to do now.
 *
 * A visit in progress if there is one, otherwise the next call of the day —
 * the card is the same either way, because the answer to "what now" is the
 * same shape whether the rep is standing in a shop or driving to it.
 */
function FocusCard({ visit, live }: { visit: Visit | null; live: boolean }) {
  if (!visit) {
    return (
      <section className="mt-5 rounded-2xl bg-sidebar-active-bg p-5 text-sidebar-active-foreground">
        <p className="text-xl font-semibold">Nothing left today</p>
        <p className="mt-2 text-sm opacity-70">Every call on today&apos;s route is done.</p>
      </section>
    );
  }

  return (
    <section className="mt-5 rounded-2xl bg-sidebar-active-bg p-5 text-sidebar-active-foreground">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-xl font-semibold">
          {live ? "Active" : "Next"}
          {live && <span aria-hidden className="size-2 rounded-full bg-success-fg" />}
        </p>

        {visit.scheduledFor && (
          <p className="shrink-0 text-sm opacity-70">{longDate(visit.scheduledFor)}</p>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold">{visit.lead.companyName}</p>
          {visit.lead.address && (
            <p className="mt-0.5 text-sm opacity-70">{visit.lead.address}</p>
          )}
        </div>

        <Link
          href={`/visits/${visit.id}`}
          className="shrink-0 rounded-lg bg-surface px-4 py-2.5 text-sm font-medium text-foreground"
        >
          {live ? "Check Out" : "Check In"}
        </Link>
      </div>
    </section>
  );
}
