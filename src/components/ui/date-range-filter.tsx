"use client";

import { useState } from "react";
import { CHIP, CHIP_OFF, CHIP_ON } from "@/components/ui/chip";
import { DateRangeField, type DayRange } from "@/components/ui/date-range-calendar";
import {
  DATE_PRESETS,
  DATE_PRESET_LABEL,
  isoDay,
  windowOf,
  type DateRange,
} from "@/lib/date-range";

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const [customising, setCustomising] = useState(value.preset === "CUSTOM");

  const seed = (): DayRange => {
    if (value.preset === "CUSTOM") return { start: value.from, end: value.to };
    const { from, to } = windowOf(value);
    const last = new Date(to);
    last.setDate(last.getDate() - 1);
    return { start: isoDay(new Date(from)), end: isoDay(last) };
  };
  const [draft, setDraft] = useState(seed);

  const pick = (next: DayRange) => {
    setDraft(next);
    if (next.start && next.end) onChange({ preset: "CUSTOM", from: next.start, to: next.end });
  };

  return (
    <div role="group" aria-label="Date range">
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((preset) => {
          const selected = !customising && value.preset === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setCustomising(false);
                onChange({ preset });
              }}
              className={`${CHIP} ${selected ? CHIP_ON : CHIP_OFF} min-h-9 hover:text-foreground`}
            >
              {DATE_PRESET_LABEL[preset]}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={customising}
          onClick={() => {
            if (!customising) setDraft(seed());
            setCustomising(true);
          }}
          className={`${CHIP} ${customising ? CHIP_ON : CHIP_OFF} min-h-9 hover:text-foreground`}
        >
          Custom range
        </button>
      </div>

      {customising && (
        <div className="mt-3">
          <DateRangeField value={draft} onChange={pick} />
        </div>
      )}
    </div>
  );
}
