"use client";

import { useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import { useClearDay, useSwapDays } from "../hooks";
import { DAY_NAMES, type Plan, type PlannedStop } from "../types";

const stopsMove = (count: number) => (count === 1 ? "1 stop moves" : `${count} stops move`);

const started = (stops: PlannedStop[]) =>
  stops.some((stop) => stop.status === "CHECKED_IN" || stop.status === "COMPLETED");

/** The date of a day in the plan's week, as YYYY-MM-DD. */
function dayKey(plan: Plan, dayIndex: number): string {
  const date = new Date(plan.weekStart);
  date.setUTCDate(date.getUTCDate() + dayIndex);
  return date.toISOString().slice(0, 10);
}

/**
 * What can be done to one whole day of a pair's plan: trade it with another
 * day, or empty it.
 *
 * A day that is over, or that a rep has started on, is left alone — the API
 * refuses both, so they are not offered.
 */
export function DayActions({
  plan,
  days,
  dayIndex,
  weekStart,
  busy,
}: {
  plan: Plan;
  days: PlannedStop[][];
  dayIndex: number;
  weekStart?: string;
  busy: boolean;
}) {
  const clear = useClearDay(weekStart);
  const swap = useSwapDays(weekStart);
  const [clearing, setClearing] = useState(false);
  const [swapTo, setSwapTo] = useState<number | null>(null);

  const today = new Date().toLocaleDateString("en-CA");
  const locked = (index: number) => dayKey(plan, index) < today || started(days[index] ?? []);

  const stops = days[dayIndex] ?? [];
  const working = busy || clear.isPending || swap.isPending;
  const thisDayLocked = locked(dayIndex);

  const swapOptions = DAY_NAMES.map((name, index) => ({
    value: String(index),
    label: name,
    hint: days[index]?.length ? `${days[index].length} stops` : "empty",
    disabled: locked(index),
  })).filter((_, index) => index !== dayIndex);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value=""
        onChange={(to) => {
          swap.reset();
          setSwapTo(Number(to));
        }}
        options={swapOptions}
        placeholder={swap.isPending ? "Swapping…" : `Swap ${DAY_NAMES[dayIndex]} with…`}
        label={`Swap ${DAY_NAMES[dayIndex]} with another day`}
        disabled={working || thisDayLocked}
        searchable={false}
        size="sm"
        className="w-52"
      />

      <Button
        variant="outline"
        onClick={() => {
          clear.reset();
          setClearing(true);
        }}
        disabled={working || thisDayLocked || stops.length === 0}
      >
        <Eraser size={16} aria-hidden />
        Clear {DAY_NAMES[dayIndex]}
      </Button>

      {swapTo !== null && (
        <ConfirmDialog
          title={`Swap ${DAY_NAMES[dayIndex]} and ${DAY_NAMES[swapTo]}?`}
          confirmLabel="Swap days"
          pendingLabel="Swapping…"
          pending={swap.isPending}
          error={swap.error?.message ?? null}
          onClose={() => setSwapTo(null)}
          onConfirm={() =>
            swap.mutate(
              { planId: plan.id, from: dayIndex, to: swapTo },
              { onSuccess: () => setSwapTo(null) },
            )
          }
        >
          <p>
            {DAY_NAMES[dayIndex]}&apos;s {stopsMove(stops.length)} to {DAY_NAMES[swapTo]}
            {days[swapTo]?.length
              ? `, and ${DAY_NAMES[swapTo]}'s ${stopsMove(days[swapTo].length)} to ${DAY_NAMES[dayIndex]}`
              : `, which is empty, so ${DAY_NAMES[dayIndex]} is left empty`}
            .
          </p>
          {plan.status === "PUBLISHED" && (
            <p className="mt-3 text-muted">
              This plan is published, so the reps will see their days change on their next sync.
            </p>
          )}
        </ConfirmDialog>
      )}

      {clearing && (
        <ConfirmDialog
          title={`Clear ${DAY_NAMES[dayIndex]}?`}
          confirmLabel={`Clear ${DAY_NAMES[dayIndex]}`}
          pendingLabel="Clearing…"
          pending={clear.isPending}
          error={clear.error?.message ?? null}
          onClose={() => setClearing(false)}
          onConfirm={() =>
            clear.mutate({ planId: plan.id, dayIndex }, { onSuccess: () => setClearing(false) })
          }
        >
          <p>
            This removes all {stops.length} {stops.length === 1 ? "stop" : "stops"} from{" "}
            {DAY_NAMES[dayIndex]}, leaving the day empty.
          </p>
          {plan.status === "PUBLISHED" && (
            <p className="mt-3 text-muted">
              This plan is published, so the reps will see the day emptied on their next sync.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}
