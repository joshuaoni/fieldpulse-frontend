"use client";

import { 
  Fragment, 
  // useState 
} from "react";
import { 
  // Map, 
  MapPin 
} from "lucide-react";
import {
  DAY_NAMES,
  dayDriveMinutes,
  dayIsEstimated,
  formatMinutes,
  // isPlotted,
  loopKm,
  type Office,
  type Plan,
  type PlannedStop,
} from "../types";
// import { RouteMap } from "./route-map";
import { StopActions } from "./stop-card";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });

export function DayRoute({
  dayIndex,
  stops,
  office,
  otherPlans,
  editable,
  busy,
  onAdjust,
  onRemove,
}: {
  dayIndex: number;
  stops: PlannedStop[];
  office?: Office;
  otherPlans: Plan[];
  editable: boolean;
  busy: boolean;
  onAdjust: (stopId: string, move: { dayIndex?: number; targetPlanId?: string }) => void;
  onRemove: (stopId: string) => void;
}) {
  // const [showMap, setShowMap] = useState(false);

  const date = stops[0]?.scheduledFor ?? null;
  // const missing = stops.filter((stop) => !isPlotted(stop)).length;
  const distance = office ? loopKm(office, stops) : null;
  const driving = dayDriveMinutes(stops);
  const homeMinutes = stops[stops.length - 1]?.returnMinutes ?? null;

  if (stops.length === 0) {
    return (
      <section className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">Nothing planned for {DAY_NAMES[dayIndex]}.</p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-xl border border-border bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-4">
        <h3 className="font-semibold">{date ? longDate(date) : DAY_NAMES[dayIndex]}</h3>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {/* {office && (
            <button
              type="button"
              onClick={() => setShowMap((shown) => !shown)}
              aria-expanded={showMap}
              className="flex min-h-9 items-center gap-1.5 font-medium hover:text-foreground"
            >
              <Map size={15} aria-hidden />
              {showMap ? "Hide map" : "Show map"}
            </button>
          )} */}
          <span>
            {stops.length} {stops.length === 1 ? "stop" : "stops"}
          </span>
          {driving !== null && (
            <span className="font-medium text-foreground tabular-nums">
              {formatMinutes(driving)} driving
            </span>
          )}
          {distance !== null && distance > 0 && (
            <span className="tabular-nums">≈ {distance.toFixed(1)} km</span>
          )}
          {dayIsEstimated(stops) && (
            <span
              title="Ordered by straight-line distance — the maps service was unavailable for this day"
              className="rounded-md bg-sunken px-2 py-0.5 text-xs"
            >
              estimated
            </span>
          )}
        </p>
      </header>

      {/* {missing > 0 && showMap && (
        <p className="border-b border-border px-5 py-3 text-sm text-muted">
          {missing} {missing === 1 ? "stop has" : "stops have"} no coordinates, so{" "}
          {missing === 1 ? "it is" : "they are"} left off the map. {missing === 1 ? "It is" : "They are"}{" "}
          still in the route.
        </p>
      )} */}

      <div className="flex flex-col gap-6 p-5 lg:flex-row">
        <ol className="min-w-0 flex-1">
          <Terminus label="Leaves the office" />

          {stops.map((stop, position) => (
            <Fragment key={stop.id}>
              <Leg minutes={stop.legMinutes} />

              <li className="flex items-start gap-3">
                <Marker>{position + 1}</Marker>

                <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pb-1">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{stop.lead.companyName}</p>
                    {stop.lead.address && (
                      <p className="truncate text-sm text-muted">{stop.lead.address}</p>
                    )}
                    {stop.lead.sector && (
                      <p className="mt-0.5 text-xs text-muted">{stop.lead.sector}</p>
                    )}
                  </div>

                  {editable && (
                    <StopActions
                      otherPlans={otherPlans}
                      busy={busy}
                      onMoveDay={(day) => onAdjust(stop.id, { dayIndex: day })}
                      onMovePair={(targetPlanId) => onAdjust(stop.id, { targetPlanId })}
                      onRemove={() => onRemove(stop.id)}
                    />
                  )}
                </div>
              </li>
            </Fragment>
          ))}

          <Leg minutes={homeMinutes} />
          <Terminus label="Back to the office" />
        </ol>

        {/* {office && showMap && (
          <div className="shrink-0 self-start">
            <RouteMap office={office} stops={stops} />
          </div>
        )} */}
      </div>
    </section>
  );
}

/** Either end of the day. The office is a place, not a call. */
function Terminus({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sunken text-muted"
      >
        <MapPin size={14} />
      </span>
      <span className="text-sm text-muted">{label}</span>
    </li>
  );
}

function Marker({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-active-bg text-xs font-medium text-sidebar-active-foreground"
    >
      {children}
    </span>
  );
}

/**
 * The drive between two stops, drawn on the line that joins them.
 *
 * The line is kept even when the time is unknown: the journey still happened,
 * and a gap in the route would read as a break in it.
 */
function Leg({ minutes }: { minutes: number | null }) {
  return (
    <li aria-hidden={minutes === null} className="flex items-center gap-3">
      <span className="flex size-7 shrink-0 justify-center">
        <span className="w-px bg-border-strong" />
      </span>
      {minutes !== null && (
        <span className="py-1.5 text-xs text-muted tabular-nums">
          {formatMinutes(minutes)} drive
        </span>
      )}
    </li>
  );
}
