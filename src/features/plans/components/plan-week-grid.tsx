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
} from "../types";
import { DayRoute } from "./day-route";
import { StopCard } from "./stop-card";

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
            <table className="w-full min-w-[46rem] text-left text-sm">
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
  const [openDay, setOpenDay] = useState<number | null>(null);

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

            {/* Scrolls sideways on a narrow viewport rather than crushing five columns. */}
            <div className="overflow-x-auto">
              <div className="grid min-w-[52rem] grid-cols-5 gap-3">
                {days.map((stops, dayIndex) => {
                  const driving = dayDriveMinutes(stops);
                  return (
                    <div key={DAY_NAMES[dayIndex]}>
                      <h3 className="mb-2 flex flex-wrap items-center gap-1 text-xs font-medium text-muted">
                        <button
                          type="button"
                          disabled={stops.length === 0}
                          aria-expanded={openDay === dayIndex}
                          onClick={() =>
                            setOpenDay((open) => (open === dayIndex ? null : dayIndex))
                          }
                          className="min-h-11 disabled:cursor-default enabled:underline enabled:decoration-dotted enabled:underline-offset-4 enabled:hover:text-foreground"
                        >
                          {DAY_NAMES[dayIndex]}
                          {stops.length > 0 && ` · ${stops.length}`}
                        </button>

                        {dayIsEstimated(stops) && (
                          <span
                            title="Ordered by straight-line distance — the maps service was unavailable for this day"
                            className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal"
                          >
                            estimated
                          </span>
                        )}
                      </h3>

                      {stops.length > 0 && (
                        <p className="mb-2 text-xs tabular-nums text-muted">
                          {driving === null
                            ? "driving time not known"
                            : `${formatMinutes(driving)} driving`}
                        </p>
                      )}

                      {stops.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
                          Nothing planned
                        </p>
                      ) : (
                        <ul>
                          {stops.map((stop, position) => (
                            <StopCard
                              key={stop.id}
                              stop={stop}
                              position={position}
                              otherPlans={otherPlans}
                              editable={editable}
                              busy={busy}
                              onMoveDay={(day) => onAdjust(stop.id, { dayIndex: day })}
                              onMovePair={(targetPlanId) => onAdjust(stop.id, { targetPlanId })}
                              onRemove={() => onRemove(stop.id)}
                            />
                          ))}

                          {stops[stops.length - 1].returnMinutes !== null && (
                            <li className="ml-2.5 flex flex-col border-l border-dashed border-border py-1 pl-3.5 text-[11px] text-muted">
                              <span className="tabular-nums">
                                {formatMinutes(stops[stops.length - 1].returnMinutes as number)}
                              </span>
                              <span>back to the office</span>
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {openDay !== null && (
              <DayRoute
                dayIndex={openDay}
                date={days[openDay][0]?.scheduledFor?.slice(0, 10) ?? null}
                stops={days[openDay]}
                office={office}
                pairName={name}
              />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
