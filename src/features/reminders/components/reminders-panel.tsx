"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useReminderSchedule } from "../hooks";
import { enablePush, pushAlreadyEnabled, pushIsSupported, type PushSetupResult } from "../push";
import { describeReminder, overdueReminders, type Reminder } from "../types";

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/** Whether this looks like an iOS browser that has not been installed yet. */
function needsHomeScreenInstall(): boolean {
  if (typeof window === "undefined") return false;
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installed =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  return iOS && !installed;
}

const SETUP_MESSAGE: Record<PushSetupResult, string> = {
  subscribed: "Notifications are on for this device.",
  unsupported: "This browser cannot show notifications.",
  denied: "Notifications are blocked. Turn them on in your browser settings for this site.",
  "not-configured": "Notifications are not set up on this deployment yet. Email still reaches you.",
  "no-worker":
    "The background worker that receives notifications is not running. In development, set NEXT_PUBLIC_ENABLE_SW=true and reload.",
  failed: "Could not turn notifications on. Email still reaches you.",
};

export function RemindersPanel() {
  const { data: reminders } = useReminderSchedule();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void pushAlreadyEnabled().then(setEnabled);
  }, []);

  const turnOn = async () => {
    setBusy(true);
    const result = await enablePush();
    setMessage(SETUP_MESSAGE[result]);
    setEnabled(result === "subscribed");
    setBusy(false);
  };

  const missed = overdueReminders(reminders ?? []);
  const next = (reminders ?? []).find((reminder) => new Date(reminder.scheduledFor) > new Date());

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium">Reminders</h2>
        {enabled === false && pushIsSupported() && (
          <Button variant="secondary" onClick={turnOn} disabled={busy} className="text-xs">
            {busy ? "Turning on…" : "Turn on notifications"}
          </Button>
        )}
      </header>

      {missed.length > 0 && <MissedList reminders={missed} />}

      {next && (
        <p className="mt-2 text-sm text-muted">
          Next: {describeReminder(next).title.toLowerCase()} at {time(next.scheduledFor)}.
        </p>
      )}

      {!missed.length && !next && (
        <p className="mt-2 text-sm text-muted">
          Nothing due. Reminders appear once a week is published.
        </p>
      )}

      {message && (
        <p role="status" className="mt-2 text-xs text-muted">
          {message}
        </p>
      )}

      {enabled === false && needsHomeScreenInstall() && (
        <p className="mt-2 text-xs text-muted">
          On iPhone, add FieldPulse to your home screen first — Safari only sends notifications to
          installed apps. You will still get the email either way.
        </p>
      )}
    </section>
  );
}

/**
 * What was due while the app was closed.
 */
function MissedList({ reminders }: { reminders: Reminder[] }) {
  return (
    <ul className="mt-2 space-y-2">
      {reminders.map((reminder) => {
        const described = describeReminder(reminder);
        return (
          <li key={reminder.id} className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium">{described.title}</p>
            <p className="text-xs text-muted">
              {described.body} · due {time(reminder.scheduledFor)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
