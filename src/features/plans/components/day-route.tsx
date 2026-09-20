"use client";

import { Fragment } from "react";

import {
  DAY_NAMES,
  dayDriveMinutes,
  dayIsEstimated,
  formatMinutes,
  isPlotted,
  loopKm,
  type Office,
  type PlannedStop,
} from "../types";
import { RouteMap } from "./route-map";

export function DayRoute({
  dayIndex,
  date,
  stops,
  office,
  pairName,
}: {
  dayIndex: number;
  date: string | null;
  stops: PlannedStop[];
  office?: Office;
  pairName: string;
}) {
  const missing = stops.filter((stop) => !isPlotted(stop)).length;
  const distance = office ? loopKm(office, stops) : null;
  const driving = dayDriveMinutes(stops);
  const homeMinutes = stops[stops.length - 1]?.returnMinutes ?? null;

  return (
    <section className="mt-3 rounded-xl border border-border bg-background p-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium">
          {pairName} · {DAY_NAMES[dayIndex]}
        </h3>
        {date && <span className="text-xs text-muted">{date}</span>}
        <span className="text-xs text-muted">
          {stops.length} {stops.length === 1 ? "stop" : "stops"}
        </span>
        
        {driving !== null && (
          <span className="text-xs font-medium tabular-nums">{formatMinutes(driving)} driving</span>
        )}
        {distance !== null && distance > 0 && (
          <span className="text-xs text-muted">≈ {distance.toFixed(1)} km as the crow flies</span>
        )}
        {dayIsEstimated(stops) && (
          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">
            estimated
          </span>
        )}
      </header>

      {!office && (
        <p className="mt-2 text-xs text-muted">
          The office location is not configured, so this route cannot be drawn. Set it on the
          backend and regenerate.
        </p>
      )}

      {missing > 0 && (
        <p className="mt-2 text-xs text-muted">
          {missing} {missing === 1 ? "stop has" : "stops have"} no coordinates and{" "}
          {missing === 1 ? "is" : "are"} left off the drawing.{" "}
          {missing === 1 ? "It is" : "They are"} still in the route below.
        </p>
      )}

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        {office && (
          <div className="shrink-0">
            <RouteMap office={office} stops={stops} />
          </div>
        )}

        <ol className="min-w-0 flex-1 space-y-1">
          <li className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden className="size-2 rotate-45 bg-foreground" />
            Leaves the office
          </li>

          {stops.map((stop, position) => (
            <Fragment key={stop.id}>
              {stop.legMinutes !== null && (
                <li className="ml-2 flex items-center gap-2 border-l border-dashed border-border py-1 pl-4 text-xs tabular-nums text-muted">
                  {formatMinutes(stop.legMinutes)}
                </li>
              )}
              <li className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-medium text-brand-ink"
                >
                  {position + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm">{stop.lead.companyName}</p>
                  {stop.lead.address && (
                    <p className="truncate text-xs text-muted">{stop.lead.address}</p>
                  )}
                </div>
              </li>
            </Fragment>
          ))}

          {homeMinutes !== null && (
            <li className="ml-2 flex items-center gap-2 border-l border-dashed border-border py-1 pl-4 text-xs tabular-nums text-muted">
              {formatMinutes(homeMinutes)}
            </li>
          )}

          <li className="flex items-center gap-2 text-xs text-muted">
            <span aria-hidden className="size-2 rotate-45 bg-foreground" />
            Back to the office
          </li>
        </ol>
      </div>
    </section>
  );
}
