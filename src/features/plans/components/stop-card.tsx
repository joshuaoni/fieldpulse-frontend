"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, formatMinutes, pairLabel, type Plan, type PlannedStop } from "../types";

/**
 * One stop, with the moves a manager can make on it.
 */
export function StopCard({
  stop,
  position,
  otherPlans,
  editable,
  busy,
  onMoveDay,
  onMovePair,
  onRemove,
}: {
  stop: PlannedStop;
  position: number;
  otherPlans: Plan[];
  editable: boolean;
  busy: boolean;
  onMoveDay: (dayIndex: number) => void;
  onMovePair: (targetPlanId: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      {stop.legMinutes !== null && (
        <p className="ml-2.5 flex items-center gap-2 border-l border-dashed border-border py-1 pl-3.5 text-[11px] tabular-nums text-muted">
          {formatMinutes(stop.legMinutes)}
        </p>
      )}

      <div className="rounded-lg border border-border bg-surface p-2">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border text-[11px] text-muted"
          >
            {position + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{stop.lead.companyName}</p>
            {stop.lead.address && (
              <p className="truncate text-xs text-muted">{stop.lead.address}</p>
            )}
            {stop.lead.sector && <p className="text-xs text-muted">{stop.lead.sector}</p>}
          </div>
        </div>

        {editable && (
          <>
            <button
              type="button"
              onClick={() => setOpen((wasOpen) => !wasOpen)}
              aria-expanded={open}
              className="mt-2 min-h-11 w-full rounded-md border border-border text-xs text-muted"
            >
              {open ? "Done" : "Move or remove"}
            </button>

            {open && (
              <div className="mt-2 space-y-2">
                <label className="block text-xs text-muted">
                  Day
                  <select
                    value=""
                    disabled={busy}
                    onChange={(event) => onMoveDay(Number(event.target.value))}
                    className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-2 text-sm"
                  >
                    <option value="" disabled>
                      Move to…
                    </option>
                    {DAY_NAMES.map((name, index) => (
                      <option key={name} value={index}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>

                {otherPlans.length > 0 && (
                  <label className="block text-xs text-muted">
                    Pair
                    <select
                      value=""
                      disabled={busy}
                      onChange={(event) => onMovePair(event.target.value)}
                      className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-2 text-sm"
                    >
                      <option value="" disabled>
                        Hand to…
                      </option>
                      {otherPlans.map((other) => (
                        <option key={other.id} value={other.id}>
                          {pairLabel(other)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <Button
                  variant="secondary"
                  onClick={onRemove}
                  disabled={busy}
                  className="w-full text-sm"
                >
                  Remove from plan
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
