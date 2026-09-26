"use client";

import { useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { placeDrop, type DropPlacement } from "@/components/ui/drop-placement";
import { Select } from "@/components/ui/select";
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
  const [placement, setPlacement] = useState<DropPlacement>({ side: "below", maxHeight: 260 });
  const trigger = useRef<HTMLButtonElement>(null);

  const reveal = () => {
    setPlacement(placeDrop(trigger.current, 260));
    setOpen(true);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? setOpen(false) : reveal())}
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

          <div
            data-side={placement.side}
            className={`absolute right-0 z-20 w-56 rounded-xl border border-border bg-surface p-3 shadow-lg ${
              placement.side === "above" ? "bottom-9" : "top-9"
            }`}
          >
            <p className="block text-xs font-medium text-muted">
              Move to a different day
            </p>
            <Select
              value=""
              disabled={busy}
              size="sm"
              label="Move to a different day"
              placeholder="Choose a day…"
              options={DAY_NAMES.map((name, index) => ({ value: String(index), label: name }))}
              onChange={(day) => onMoveDay(Number(day))}
              className="mt-1.5"
            />

            {otherPlans.length > 0 && (
              <>
                <p className="mt-3 block text-xs font-medium text-muted">Hand to another pair</p>
                <Select
                  value=""
                  disabled={busy}
                  size="sm"
                  label="Hand to another pair"
                  placeholder="Choose a pair…"
                  options={otherPlans.map((other) => ({
                    value: other.id,
                    label: pairLabel(other),
                  }))}
                  onChange={onMovePair}
                  className="mt-1.5"
                />
              </>
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
