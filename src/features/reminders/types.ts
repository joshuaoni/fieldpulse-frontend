export type ReminderKind = "DEPARTURE" | "END_OF_DAY";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  scheduledFor: string;
  visitDay: string;
  visit: {
    legMinutes: number | null;
    lead: { companyName: string };
  } | null;
}

export interface ReminderCopy {
  id: string;
  scheduledFor: string;
  title: string;
  body: string;
}

export function describeReminder(reminder: Reminder): ReminderCopy {
  if (reminder.kind === "DEPARTURE") {
    const stop = reminder.visit?.lead.companyName;
    const drive = reminder.visit?.legMinutes;
    const distance = drive ? ` — about ${drive} min away` : "";

    return {
      id: reminder.id,
      scheduledFor: reminder.scheduledFor,
      title: "Time to set off",
      body: stop ? `First stop: ${stop}${distance}.` : "Your first visit is coming up.",
    };
  }

  return {
    id: reminder.id,
    scheduledFor: reminder.scheduledFor,
    title: "Reports still to submit",
    body: "Check today's visits before you finish.",
  };
}

export function overdueReminders(reminders: Reminder[], now = new Date()): Reminder[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return reminders.filter((reminder) => {
    const at = new Date(reminder.scheduledFor);
    return at <= now && at >= startOfToday;
  });
}
