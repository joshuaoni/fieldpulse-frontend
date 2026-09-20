"use client";

import { isPlotted, type Office, type PlannedStop } from "../types";

const WIDTH = 320;
const PADDING = 22;

/**
 * A day's route drawn to scale, without a map service.
 *
 * There is deliberately no basemap: tiles would need a browser-side Maps key
 * and a network round trip on a page a manager opens dozens of times, and the
 * question being answered here is "does this order make sense" — which is
 * about the shape of the loop and the spread of the stops, not what street
 * they are on. The addresses are right there in the list beside it.
 */
export function RouteMap({ office, stops }: { office: Office; stops: PlannedStop[] }) {
  const plotted = stops.filter(isPlotted);
  if (!plotted.length) return null;

  const points = [office, ...plotted.map((stop) => stop.lead)];

  const midLat = points.reduce((total, point) => total + point.lat, 0) / points.length;
  const squeeze = Math.cos((midLat * Math.PI) / 180);
  const xs = points.map((point) => point.lng * squeeze);
  const ys = points.map((point) => -point.lat);

  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1e-4);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1e-4);
  const span = Math.max(spanX, spanY, 1e-4);
  const usableSpanX = Math.max(spanX, span / 2.2);
  const usableSpanY = Math.max(spanY, span / 2.2);

  const height = Math.round(((WIDTH - PADDING * 2) * usableSpanY) / usableSpanX) + PADDING * 2;
  const scale = (WIDTH - PADDING * 2) / usableSpanX;
  const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;

  const project = (point: Office) => ({
    x: WIDTH / 2 + (point.lng * squeeze - centreX) * scale,
    y: height / 2 + (-point.lat - centreY) * scale,
  });

  const start = project(office);
  const legs = [start, ...plotted.map((stop) => project(stop.lead)), start];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label={`Route shape for ${plotted.length} stops, starting and ending at the office`}
    >
      <polyline
        points={legs.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="var(--brand)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray="4 3"
        opacity={0.7}
      />

      {plotted.map((stop, position) => {
        const point = project(stop.lead);
        return (
          <g key={stop.id}>
            <circle cx={point.x} cy={point.y} r={8} fill="var(--brand)" />
            <text
              x={point.x}
              y={point.y + 3.2}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="var(--surface)"
            >
              {position + 1}
            </text>
          </g>
        );
      })}

      <rect
        x={start.x - 5}
        y={start.y - 5}
        width={10}
        height={10}
        fill="var(--foreground)"
        transform={`rotate(45 ${start.x} ${start.y})`}
      />
      <text x={start.x + 10} y={start.y + 3.5} fontSize={9} fill="var(--muted)">
        Office
      </text>
    </svg>
  );
}
