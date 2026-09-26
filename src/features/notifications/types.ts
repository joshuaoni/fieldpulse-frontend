import type { Reminder } from "@/features/reminders/types";
import type { Visit } from "@/features/visits/types";

export type NotificationKind = "REMINDER" | "REPORT_SUBMITTED" | "VISIT_ADDED";

export interface FieldNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  href?: string;
}

export type NotificationRange = "TODAY" | "WEEK" | "MONTH";

export const RANGE_LABEL: Record<NotificationRange, string> = {
  TODAY: "Today",
  WEEK: "This Week",
  MONTH: "This Month",
};

/** Midnight at the start of the range, which is where its window opens. */
export function rangeStart(range: NotificationRange, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "WEEK") start.setDate(start.getDate() - 6);
  if (range === "MONTH") start.setDate(start.getDate() - 29);

  return start;
}

function fromReminder(reminder: Reminder): FieldNotification {
  const stop = reminder.visit?.lead.companyName;
  const drive = reminder.visit?.legMinutes;

  if (reminder.kind === "DEPARTURE") {
    return {
      id: `reminder:${reminder.id}`,
      kind: "REMINDER",
      title: "Check-in reminder",
      body:
        stop && drive
          ? `You're ${drive} min from ${stop}, your next stop.`
          : stop
            ? `${stop} is your next stop.`
            : "Your first visit is coming up.",
      at: reminder.scheduledFor,
    };
  }

  return {
    id: `reminder:${reminder.id}`,
    kind: "REMINDER",
    title: "Reports still to submit",
    body: "Check today's visits before you finish.",
    at: reminder.scheduledFor,
  };
}

/**
 * Everything worth telling this rep about, newest first.
 */
export function buildFeed({
  reminders,
  visits,
  repId,
  now = new Date(),
}: {
  reminders: Reminder[];
  visits: Visit[];
  repId: string | undefined;
  now?: Date;
}): FieldNotification[] {
  const items: FieldNotification[] = reminders
    .filter((reminder) => new Date(reminder.scheduledFor) <= now)
    .map(fromReminder);

  for (const visit of visits) {
    const report = visit.report;
    if (report && (!repId || report.attendance?.rep?.id === repId)) {
      items.push({
        id: `report:${report.id}`,
        kind: "REPORT_SUBMITTED",
        title: visit.lead.companyName,
        body: `Your report for ${visit.lead.companyName} was submitted successfully.`,
        at: report.submittedAt,
        href: `/visits/${visit.id}`,
      });
    }

    if (!visit.planId) {
      items.push({
        id: `visit:${visit.id}`,
        kind: "VISIT_ADDED",
        title: "New stop added",
        body: `${visit.lead.companyName} was added to your route.`,
        at: visit.createdAt,
        href: `/visits/${visit.id}`,
      });
    }
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/**
 * The feed under its day headings, newest day first.
 */
export function byDay(
  notifications: FieldNotification[],
  now = new Date(),
): Array<{ label: string; items: FieldNotification[] }> {
  const groups = new Map<string, FieldNotification[]>();

  for (const item of notifications) {
    const key = new Date(item.at).toDateString();
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const today = now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  return [...groups].map(([key, items]) => ({
    label:
      key === today
        ? "Today"
        : key === yesterday.toDateString()
          ? "Yesterday"
          : new Date(key).toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            }),
    items,
  }));
}
