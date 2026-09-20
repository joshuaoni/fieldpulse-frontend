"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export function PlanWeekGrid() {
  const [weekStart, setWeekStart] = useState(thisMonday);
  const { data: week, isPending, isError, error } = usePlans(weekStart);
  const plans = week?.plans;

  const generate = useGeneratePlans(weekStart);
  const adjust = useAdjustStop(weekStart);
  const remove = useRemoveStop(weekStart);
  const publish = usePublishWeek(weekStart);

  const busy = adjust.isPending || remove.isPending || publish.isPending;
  const draftCount = (plans ?? []).filter((plan) => plan.status === "DRAFT").length;
  const failure =
    generate.error ?? adjust.error ?? remove.error ?? publish.error ?? (isError ? error : null);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8">
      <header>
        <Link href="/manager" className="text-sm text-brand underline">
          ← Team visits
        </Link>
        <h1 className="mt-2 text-lg font-semibold tracking-tight">Weekly plan</h1>
        <p className="text-sm text-muted">
          Review and adjust, then publish every pair together. Reps see nothing until you do.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setWeekStart(shiftWeeks(weekStart, -1))}>
          ← Previous
        </Button>
        <span className="text-sm font-medium">Week of {weekStart}</span>
        <Button variant="secondary" onClick={() => setWeekStart(shiftWeeks(weekStart, 1))}>
          Next →
        </Button>
        <Button
          variant="secondary"
          onClick={() => generate.mutate()}
          disabled={generate.isPending || busy}
          className="ml-auto"
        >
          {generate.isPending ? "Planning…" : "Generate drafts"}
        </Button>
        <Button
          onClick={() => publish.mutate()}
          disabled={busy || generate.isPending || draftCount === 0}
        >
          {publish.isPending
            ? "Publishing…"
            : `Publish week${draftCount ? ` (${draftCount})` : ""}`}
        </Button>
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
          No plans for this week yet. Generate drafts to propose one per pair.
        </p>
      )}

      {plans?.map((plan) => (
        <PlanRow
          key={plan.id}
          plan={plan}
          office={week?.office}
          otherPlans={plans.filter((other) => other.id !== plan.id && other.status !== "ARCHIVED")}
          busy={busy}
          onAdjust={(visitId, changes) => adjust.mutate({ planId: plan.id, visitId, ...changes })}
          onRemove={(visitId) => remove.mutate({ planId: plan.id, visitId })}
        />
      ))}
    </main>
  );
}

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

  const [openDay, setOpenDay] = useState<number | null>(null);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-medium">{name}</h2>
        <span className="text-xs text-muted">
          {total} {total === 1 ? "stop" : "stops"}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-xs ${
            live ? "border-brand text-brand" : "border-border text-muted"
          }`}
        >
          {plan.status === "DRAFT" ? "Draft" : live ? "Published" : "Archived"}
        </span>

        {live && (
          <span className="text-xs text-muted">
            Reps are working from this — changes reach them on their next sync.
          </span>
        )}
      </header>

      {/* Scrolls sideways on a phone rather than crushing five columns. */}
      <div className="mt-3 overflow-x-auto">
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
                    onClick={() => setOpenDay((open) => (open === dayIndex ? null : dayIndex))}
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
    </section>
  );
}
