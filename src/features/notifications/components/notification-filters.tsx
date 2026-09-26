"use client";

import { Modal } from "@/components/ui/modal";
import { RANGE_LABEL, type NotificationRange } from "../types";

const RANGES: NotificationRange[] = ["TODAY", "WEEK", "MONTH"];

/**
 * One choice, applied as it is made — there is nothing here to confirm.
 */
export function NotificationFilters({
  range,
  onChange,
  onClose,
}: {
  range: NotificationRange;
  onChange: (range: NotificationRange) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      onClose={onClose}
      label="Filter by date"
      header={
        <div className="w-full text-center">
          <h2 className="text-lg font-semibold tracking-tight">Filter by date</h2>
          <p className="mt-0.5 text-sm text-muted">Choose a range to narrow the results</p>
        </div>
      }
    >
      <fieldset>
        <legend className="sr-only">Date range</legend>

        <div className="flex flex-col gap-2">
          {RANGES.map((value) => {
            const selected = range === value;

            return (
              <label
                key={value}
                className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-4 ${
                  selected ? "bg-chip-active-bg" : "hover:bg-sunken"
                }`}
              >
                <input
                  type="radio"
                  name="notification-range"
                  value={value}
                  checked={selected}
                  onChange={() => {
                    onChange(value);
                    onClose();
                  }}
                  className="size-4 accent-chip-active-edge"
                />
                <span className="text-sm font-medium">{RANGE_LABEL[value]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </Modal>
  );
}
