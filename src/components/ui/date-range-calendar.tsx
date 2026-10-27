"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export interface DayRange {
  start: string;
  end: string;
}

/** Local midnight, so a picked day never drifts across UTC. */
function fromIso(iso: string): Date | null {
  if (!iso) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function toIso(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();

/** Full weeks covering the month, Monday first; neighbouring months fill the edges. */
function cellsOf(month: Date): Array<{ date: Date; inMonth: boolean }> {
  const lead = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return Array.from({ length: Math.ceil((lead + days) / 7) * 7 }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), 1 - lead + index);
    return { date, inMonth: date.getMonth() === month.getMonth() };
  });
}

const fmt = (iso: string) =>
  fromIso(iso)!.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });

function label({ start, end }: DayRange): string {
  if (start && end) return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return "Select date range";
}

/** Single-month range calendar: tap a start day, then an end day. */
export function DateRangeCalendar({
  value,
  onChange,
}: {
  value: DayRange;
  onChange: (value: DayRange) => void;
}) {
  const start = fromIso(value.start);
  const end = fromIso(value.end);

  const [month, setMonth] = useState(() => {
    const base = start ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const pick = (date: Date) => {
    if (!start || end) return onChange({ start: toIso(date), end: "" });
    const [from, to] = date < start ? [date, start] : [start, date];
    onChange({ start: toIso(from), end: toIso(to) });
  };

  const shift = (by: number) =>
    setMonth((held) => new Date(held.getFullYear(), held.getMonth() + by, 1));

  return (
    <div className="w-full rounded-xl border border-calendar-edge bg-calendar-bg p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[15px] font-bold text-calendar-title">
          {month.toLocaleDateString([], { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => shift(-1)}
            className="flex size-7 items-center justify-center rounded-md text-calendar-accent hover:bg-calendar-cell-edge"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => shift(1)}
            className="flex size-7 items-center justify-center rounded-md text-calendar-accent hover:bg-calendar-cell-edge"
          >
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1.5" aria-hidden>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} className="text-center text-xs font-semibold text-calendar-hint">
            {weekday}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cellsOf(month).map(({ date, inMonth }) => {
          if (!inMonth)
            return (
              <span
                key={date.getTime()}
                className="flex h-9 items-center justify-center text-[13px] text-calendar-outside"
              >
                {date.getDate()}
              </span>
            );

          const selected = sameDay(date, start) || sameDay(date, end);
          const between = !!start && !!end && date > start && date < end;

          return (
            <button
              key={date.getTime()}
              type="button"
              aria-pressed={selected || between}
              aria-label={date.toLocaleDateString([], { dateStyle: "full" })}
              onClick={() => pick(date)}
              className={`flex h-9 items-center justify-center rounded-[10px] border text-[13px] ${
                selected
                  ? "border-calendar-accent bg-calendar-accent font-semibold text-calendar-cell"
                  : between
                    ? "border-calendar-range bg-calendar-range text-calendar-title"
                    : "border-calendar-cell-edge bg-calendar-cell text-calendar-title hover:border-calendar-accent"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-[11px] text-calendar-hint">
        {start && !end ? "Now pick the end date" : "Pick a start date, then an end date"}
      </p>
    </div>
  );
}

export function DateRangeField({
  value,
  onChange,
}: {
  value: DayRange;
  onChange: (value: DayRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full max-w-80">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((held) => !held)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-calendar-edge bg-calendar-bg px-4 text-sm"
      >
        <span
          className={value.start ? "text-calendar-field-text" : "text-calendar-field-placeholder"}
        >
          {label(value)}
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/calendar-03.svg" alt="" aria-hidden className="size-5 shrink-0" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute top-full left-0 z-30 mt-1.5 w-full min-w-75 max-w-[calc(100vw-2rem)] rounded-xl bg-calendar-cell shadow-[0_8px_24px_var(--color-calendar-shadow)]"
        >
          <DateRangeCalendar
            value={value}
            onChange={(next) => {
              onChange(next);
              if (next.start && next.end) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
