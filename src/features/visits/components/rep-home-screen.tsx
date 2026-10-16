"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { LogUnplannedVisit } from "./log-unplanned-visit";
import { useMyFieldRole } from "@/lib/field-role";
import { useSession } from "@/lib/session";
import { usePendingActions, useMyVisits, useQueueFlush } from "../hooks";
import { myAttendance, type Visit } from "../types";
import { repStatus } from "../week";
import { RepAccountMenu } from "./rep-account-menu";
import { RouteCard } from "./route-card";
import { FieldPulseLoader } from "@/components/ui/fieldpulse-loader";
import { PAGE_SIZE, Pager, usePagedItems } from "@/components/ui/pager";

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

type Filter = "ALL" | "VISITED" | "NOT_VISITED" | "NOT_CHECKED_OUT";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "VISITED", label: "Visited" },
  { value: "NOT_VISITED", label: "Not Visited" },
  { value: "NOT_CHECKED_OUT", label: "Not checked out" },
];

const checkedInAt = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function RepHomeScreen() {
  const { user } = useSession();
  const fieldRole = useMyFieldRole();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [logging, setLogging] = useState(false);

  // Replays anything recorded offline as soon as this screen mounts, and
  // again whenever the connection returns.
  useQueueFlush();

  const window = useMemo(() => todayWindow(), []);
  const { data, isPending, isError } = useMyVisits({ ...window, pageSize: 100 });
  const pending = usePendingActions();
  const openCheckIns = useMyVisits({ openCheckIn: true, pageSize: 100 });
  const unclosed = useMemo(() => {
    const at = (visit: Visit) => (user ? myAttendance(visit, user.id)?.checkInAt : null) ?? "";
    return [...(openCheckIns.data?.visits ?? [])].sort((a, b) => at(a).localeCompare(at(b)));
  }, [openCheckIns.data, user]);

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

  const shownPage = usePagedItems(shown, filter);
  const unclosedPage = usePagedItems(unclosed);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 py-6">
      <header className="flex items-center gap-3">
        <RepAccountMenu
          roleLabel={ROLE_LABEL[fieldRole.data?.fieldRole ?? ""] ?? "Field"}
          pending={pending}
        />

        <NotificationsBell />
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

      <button
        type="button"
        onClick={() => setLogging(true)}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-sm font-medium text-muted hover:bg-sunken"
      >
        <Plus size={16} aria-hidden />
        Log a visit that is not planned
      </button>

      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
              filter === value
                ? "bg-sidebar-active-bg text-sidebar-active-foreground"
                : "border border-border bg-surface"
            }`}
          >
            {label}
            {value === "NOT_CHECKED_OUT" && unclosed.length > 0 && ` (${unclosed.length})`}
          </button>
        ))}
      </div>

      {filter === "NOT_CHECKED_OUT" ? (
        <div className="flex flex-1 flex-col">
          {openCheckIns.isPending && (
            <Centered>
              <FieldPulseLoader prominent />
            </Centered>
          )}

          {openCheckIns.isError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Could not load your open check-ins.
            </p>
          )}

          {openCheckIns.data && unclosed.length === 0 && (
            <Centered>
              <EmptyBox>You have checked out of every visit.</EmptyBox>
            </Centered>
          )}

          <ul className="mt-3 flex flex-col gap-3">
            {unclosedPage.pageItems.map((visit) => (
              <OpenCheckInCard
                key={visit.id}
                visit={visit}
                checkInAt={user ? myAttendance(visit, user.id)?.checkInAt ?? null : null}
              />
            ))}
          </ul>

          <Pager
            page={unclosedPage.page}
            totalItems={unclosedPage.totalItems}
            onPageChange={unclosedPage.setPage}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {isPending && (
            <Centered>
              <FieldPulseLoader prominent />
            </Centered>
          )}

          {isError && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Could not load today&apos;s calls.
            </p>
          )}

          {data && visits.length === 0 && (
            <Centered>
              <EmptyBox>New visits will appear here when available.</EmptyBox>
            </Centered>
          )}

          {data && visits.length > 0 && shown.length === 0 && (
            <Centered>
              <EmptyBox>Nothing here under that filter.</EmptyBox>
            </Centered>
          )}

          <ul className="mt-3 flex flex-col gap-3">
            {shownPage.pageItems.map((visit, index) => (
              <RouteCard
                key={visit.id}
                visit={visit}
                position={(shownPage.page - 1) * PAGE_SIZE + index}
                selfId={user?.id}
              />
            ))}
          </ul>

          <Pager
            page={shownPage.page}
            totalItems={shownPage.totalItems}
            onPageChange={shownPage.setPage}
          />
        </div>
      )}

      {logging && <LogUnplannedVisit onClose={() => setLogging(false)} />}
    </main>
  );
}

function OpenCheckInCard({ visit, checkInAt }: { visit: Visit; checkInAt: string | null }) {
  return (
    <li>
      <Link
        href={`/visits/${visit.id}`}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-sunken"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{visit.lead.companyName}</span>
          {visit.lead.address && (
            <span className="mt-0.5 block truncate text-sm text-muted">{visit.lead.address}</span>
          )}
          {checkInAt && (
            <span className="mt-1 block text-sm text-muted">
              Checked in {checkedInAt(checkInAt)}
            </span>
          )}
        </span>

        <span className="shrink-0 rounded-md bg-warning/10 px-2 py-1 text-xs/none font-medium text-warning-fg">
          Not checked out
        </span>
        <ChevronRight size={18} aria-hidden className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col justify-center py-4">{children}</div>;
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-sm text-muted">
      {children}
    </p>
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
          {visit.lead.address && <p className="mt-0.5 text-sm opacity-70">{visit.lead.address}</p>}
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
