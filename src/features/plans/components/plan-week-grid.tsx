"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, RotateCw } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { MemberAvatars } from "@/components/ui/member-avatars";
import { useAdjustStop, useGeneratePlans, usePlans, usePublishWeek, useRemoveStop } from "../hooks";
import {
  DAY_NAMES,
  dayDriveMinutes,
  dayIsEstimated,
  formatMinutes,
  pairLabel,
  stopsByDay,
  type Office,
  type Plan,
  type PlannedStop,
} from "../types";
import { DayRoute } from "./day-route";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function thisMonday(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function shiftWeeks(isoDate: string, weeks: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return date.toISOString().slice(0, 10);
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);

  const month = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = (date: Date) => date.getUTCDate();

  return month(start) === month(end)
    ? `${month(start)} ${day(start)}–${day(end)}`
    : `${month(start)} ${day(start)} – ${month(end)} ${day(end)}`;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function PlanWeekGrid() {
  const [weekStart, setWeekStart] = useState(thisMonday);
  const { data: week, isPending, isError, error } = usePlans(weekStart);
  const plans = week?.plans;
  const activePlans = (plans ?? []).filter((plan) => plan.status !== "ARCHIVED");

  const generate = useGeneratePlans(weekStart);
  const adjust = useAdjustStop(weekStart);
  const remove = useRemoveStop(weekStart);
  const publish = usePublishWeek(weekStart);

  const busy = adjust.isPending || remove.isPending || publish.isPending;
  const draftCount = (plans ?? []).filter((plan) => plan.status === "DRAFT").length;
  const anyPublished = activePlans.some((plan) => plan.status === "PUBLISHED");
  const totalLeads = activePlans.reduce((sum, plan) => sum + plan.visits.length, 0);
  const failure =
    generate.error ?? adjust.error ?? remove.error ?? publish.error ?? (isError ? error : null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4">
      <Breadcrumb segments={[{ label: "Weekly Plan" }]} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Weekly plan</h1>
          <p className="text-sm text-muted">{formatWeekRange(weekStart)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setWeekStart(shiftWeeks(weekStart, -1))}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(shiftWeeks(weekStart, 1))}>
            Next
          </Button>
          <Button
            variant="outline"
            onClick={() => generate.mutate()}
            disabled={generate.isPending || busy}
          >
            <RotateCw size={18} aria-hidden />
            {generate.isPending ? "Planning…" : "Regenerate"}
          </Button>
          <Button
            variant="dark"
            onClick={() => publish.mutate()}
            disabled={busy || generate.isPending || draftCount === 0}
          >
            <Plus size={18} aria-hidden />
            {publish.isPending
              ? "Publishing…"
              : `Publish plan${draftCount ? ` (${draftCount})` : ""}`}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Pairs assigned" value={activePlans.length} />
        <StatCard label="Total leads" value={totalLeads} />
        <StatCard label="Status" value={anyPublished ? "Published" : "Draft"} />
      </div>

      {generate.data && !generate.data.roadAccurate && (
        <p role="status" className="rounded-lg border border-border p-3 text-sm text-muted">
          Some days were ordered by straight-line distance — the maps service was unavailable for
          them, so those routes ignore roads and traffic. They are marked below, and regenerating
          usually fixes it.
        </p>
      )}

      {failure && (
        <p role="alert" className="rounded-lg border border-danger p-3 text-sm text-danger">
          {message(failure)}
        </p>
      )}

      {isPending && <p className="text-sm text-muted">Loading the week…</p>}

      {plans && plans.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          No plans for this week yet. Regenerate to propose one per pair.
        </p>
      )}

      {plans && plans.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-184 text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Active pairs
                  </th>
                  {DAY_NAMES.map((day) => (
                    <th key={day} scope="col" className="px-2 py-3 text-center font-medium">
                      {day.slice(0, 3)}
                    </th>
                  ))}
                  <th scope="col" className="px-2 py-3 text-center font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <PlanRow
                    key={plan.id}
                    plan={plan}
                    office={week?.office}
                    otherPlans={plans.filter(
                      (other) => other.id !== plan.id && other.status !== "ARCHIVED",
                    )}
                    busy={busy}
                    onAdjust={(visitId, changes) =>
                      adjust.mutate({ planId: plan.id, visitId, ...changes })
                    }
                    onRemove={(visitId) => remove.mutate({ planId: plan.id, visitId })}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <p className="flex items-start gap-2 border-t border-border bg-background px-4 py-3 text-xs text-muted">
            Active pairs are organized by day of the week, along with the number of assigned visits
            for each day.
          </p>
        </div>
      )}
    </div>
  );
}

const COLUMN_COUNT = DAY_NAMES.length + 3;

function PlanRow({
  plan,
  otherPlans,
  office,
  busy,
  onAdjust,
  onRemove,
}: {
  plan: Plan;
  otherPlans: Plan[];
  office?: Office;
  busy: boolean;
  onAdjust: (visitId: string, changes: { dayIndex?: number; targetPlanId?: string }) => void;
  onRemove: (visitId: string) => void;
}) {
  const days = stopsByDay(plan);
  const editable = plan.status !== "ARCHIVED";
  const live = plan.status === "PUBLISHED";
  const total = plan.visits.length;
  const name = pairLabel(plan);
  const members = plan.pair?.members ?? [];

  const [expanded, setExpanded] = useState(false);
  const [openDay, setOpenDay] = useState(0);

  return (
    <>
      <tr className="border-b border-border last:border-0 hover:bg-background">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="flex min-h-11 w-full items-center gap-3 text-left"
          >
            <MemberAvatars users={members.map((member) => member.user)} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{name}</span>
            </span>
          </button>
        </td>

        {days.map((stops, dayIndex) => (
          <td key={DAY_NAMES[dayIndex]} className="px-2 py-3 text-center tabular-nums">
            {stops.length > 0 ? stops.length : <span className="text-muted">—</span>}
          </td>
        ))}

        <td className="px-2 py-3 text-center font-medium tabular-nums">{total}</td>

        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
            className="ml-auto flex size-9 items-center justify-center rounded-lg text-muted hover:bg-background hover:text-foreground"
          >
            {expanded ? (
              <ChevronDown className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-border bg-background last:border-0">
          <td colSpan={COLUMN_COUNT} className="p-4">
            {live && (
              <p className="mb-3 text-xs text-muted">
                Reps are working from this — changes reach them on their next sync.
              </p>
            )}

            <DayTabs days={days} selected={openDay} onSelect={setOpenDay} />

            <DayRoute
              dayIndex={openDay}
              stops={days[openDay]}
              office={office}
              otherPlans={otherPlans}
              editable={editable}
              busy={busy}
              onAdjust={onAdjust}
              onRemove={onRemove}
            />
          </td>
        </tr>
      )}
    </>
  );
}

function DayTabs({
  days,
  selected,
  onSelect,
}: {
  days: PlannedStop[][];
  selected: number;
  onSelect: (dayIndex: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {days.map((stops, dayIndex) => {
        const driving = dayDriveMinutes(stops);
        const active = dayIndex === selected;

        return (
          <button
            key={DAY_NAMES[dayIndex]}
            type="button"
            onClick={() => onSelect(dayIndex)}
            aria-pressed={active}
            className={`min-w-28 rounded-lg border px-3 py-2 text-left ${
              active
                ? "border-chip-active-edge bg-chip-active-bg"
                : "border-chip-edge bg-chip-bg hover:border-control-edge"
            }`}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {DAY_NAMES[dayIndex]}
              {dayIsEstimated(stops) && (
                <span
                  title="Ordered by straight-line distance — the maps service was unavailable"
                  className="rounded bg-sunken px-1 text-[10px] font-normal text-muted"
                >
                  est.
                </span>
              )}
            </span>
            <span className="block text-xs text-muted tabular-nums">
              {stops.length === 0
                ? "Nothing planned"
                : `${stops.length} ${stops.length === 1 ? "stop" : "stops"}${
                    driving === null ? "" : ` · ${formatMinutes(driving)}`
                  }`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
