"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAY_NAMES, pairLabel, type Plan } from "../types";

/**
 * One stop, with the moves a manager can make on it.
 */
export function StopActions({
  otherPlans,
  busy,
  onMoveDay,
  onMovePair,
  onRemove,
}: {
  otherPlans: Plan[];
  busy: boolean;
  onMoveDay: (dayIndex: number) => void;
  onMovePair: (targetPlanId: string) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-label="Move or remove this stop"
        className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-foreground"
      >
        <MoreHorizontal size={16} aria-hidden />
      </button>

      {open && (
        <>
          {/* Clicking anywhere else puts it away, the way a menu should. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />

          <div className="absolute top-9 right-0 z-20 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg">
            <label className="block text-xs font-medium text-muted">
              Move to a different day
              <select
                value=""
                disabled={busy}
                onChange={(event) => onMoveDay(Number(event.target.value))}
                className="mt-1.5 min-h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
              >
                <option value="" disabled>
                  Choose a day…
                </option>
                {DAY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            {otherPlans.length > 0 && (
              <label className="mt-3 block text-xs font-medium text-muted">
                Hand to another pair
                <select
                  value=""
                  disabled={busy}
                  onChange={(event) => onMovePair(event.target.value)}
                  className="mt-1.5 min-h-10 w-full rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                >
                  <option value="" disabled>
                    Choose a pair…
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
              variant="outline"
              onClick={onRemove}
              disabled={busy}
              className="mt-3 w-full text-sm text-danger"
            >
              Remove from plan
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
