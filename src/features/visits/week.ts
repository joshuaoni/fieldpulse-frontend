import type { PairMember } from "@/lib/pairs";
import type { Visit, VisitStatus } from "./types";

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

/** Monday 00:00 UTC of the week containing this date. */
export function weekStartOf(date = new Date()): Date {
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return monday;
}

export function weekWindow(weekStart: Date): { from: string; to: string } {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 5);
  return { from: weekStart.toISOString(), to: end.toISOString() };
}

/** Monday to Friday, each holding that day's stops in route order. */
export function visitsByDay(visits: Visit[], weekStart: Date): Visit[][] {
  const days: Visit[][] = DAY_NAMES.map(() => []);

  for (const visit of visits) {
    if (!visit.scheduledFor) continue;

    const day = Math.round(
      (Date.parse(visit.scheduledFor) - weekStart.getTime()) / 86_400_000,
    );
    if (day >= 0 && day < days.length) days[day].push(visit);
  }

  // Unplanned visits carry no stop order; they sort last rather than first.
  return days.map((day) =>
    [...day].sort((a, b) => (a.stopOrder ?? Infinity) - (b.stopOrder ?? Infinity)),
  );
}

export const plannedDays = (days: Visit[][]): number =>
  days.filter((day) => day.length > 0).length;

/** The rep's partner on the day. */
export function partnersOf(visits: Visit[], selfId: string | undefined): PairMember[] {
  const members = visits[0]?.pair?.members ?? [];
  return members.filter((member) => member.user.id !== selfId);
}

export const STATUS_LABEL: Record<VisitStatus, string> = {
  PLANNED: "Not visited",
  CHECKED_IN: "On site",
  COMPLETED: "Visited",
  MISSED: "Missed",
};

export const STATUS_TONE: Record<VisitStatus, string> = {
  PLANNED: "bg-amber-500/10 text-amber-700",
  CHECKED_IN: "bg-chip-active-bg text-chip-active-edge",
  COMPLETED: "bg-success-bg text-success-fg",
  MISSED: "bg-danger/10 text-danger",
};

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function driveLabel(visit: Visit, position: number): string | null {
  if (visit.legMinutes === null) return null;

  return position === 0
    ? `${formatMinutes(visit.legMinutes)} from the office`
    : `${formatMinutes(visit.legMinutes)} drive`;
}
