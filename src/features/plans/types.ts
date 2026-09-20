import type { PairMember } from "@/lib/pairs";

export { pairLabel } from "@/lib/pairs";
export type { PairMember } from "@/lib/pairs";

export type PlanStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface PlannedStop {
  id: string;
  leadId: string;
  scheduledFor: string | null;
  stopOrder: number | null;
  routeEstimated: boolean;
  legMinutes: number | null;
  returnMinutes: number | null;
  status: "PLANNED" | "CHECKED_IN" | "COMPLETED" | "MISSED";
  lead: {
    id: string;
    companyName: string;
    address: string | null;
    sector: string | null;
    lat: number | null;
    lng: number | null;
  };
}

export interface Office {
  lat: number;
  lng: number;
}

export interface Plan {
  id: string;
  pairId: string;
  weekStart: string;
  status: PlanStatus;
  generatedAt: string;
  publishedAt: string | null;
  pair?: { id: string; name: string | null; members?: PairMember[] };
  visits: PlannedStop[];
}

export interface GenerateResult {
  weekStart: string;
  elements: number;
  roadAccurate: boolean;
  plans: Array<{ planId: string; pairId: string; days: number; stops: number }>;
}

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

export function dayIndexOf(stop: PlannedStop, weekStart: string): number {
  if (!stop.scheduledFor) return 0;
  const days = (Date.parse(stop.scheduledFor) - Date.parse(weekStart)) / 86_400_000;
  return Math.max(0, Math.round(days));
}

export const dayIsEstimated = (stops: PlannedStop[]): boolean =>
  stops.length > 0 && stops.every((stop) => stop.routeEstimated);

export function stopsByDay(plan: Plan, dayCount = DAY_NAMES.length): PlannedStop[][] {
  const days: PlannedStop[][] = Array.from({ length: dayCount }, () => []);

  for (const stop of plan.visits) {
    const index = dayIndexOf(stop, plan.weekStart);
    if (index < dayCount) days[index].push(stop);
  }

  return days.map((day) => [...day].sort((a, b) => (a.stopOrder ?? 0) - (b.stopOrder ?? 0)));
}

export type PlottedStop = PlannedStop & { lead: { lat: number; lng: number } };

export const isPlotted = (stop: PlannedStop): stop is PlottedStop =>
  typeof stop.lead.lat === "number" && typeof stop.lead.lng === "number";

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(from: Office, to: Office): number {
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function loopKm(office: Office, stops: PlannedStop[]): number {
  const plotted = stops.filter(isPlotted).map((stop) => stop.lead);
  if (!plotted.length) return 0;

  let total = distanceKm(office, plotted[0]);
  for (let index = 0; index < plotted.length - 1; index++) {
    total += distanceKm(plotted[index], plotted[index + 1]);
  }
  return total + distanceKm(plotted[plotted.length - 1], office);
}

export function dayDriveMinutes(stops: PlannedStop[]): number | null {
  if (!stops.length) return null;

  const last = stops[stops.length - 1];
  if (last.returnMinutes === null) return null;

  let total = last.returnMinutes;
  for (const stop of stops) {
    if (stop.legMinutes === null) return null;
    total += stop.legMinutes;
  }
  return total;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
}
