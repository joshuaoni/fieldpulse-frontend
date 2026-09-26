"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { enablePush, pushAlreadyEnabled, pushIsSupported, type PushSetupResult } from "../push";

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
    process.env.NODE_ENV === "production"
      ? "The background worker that receives notifications is not running. Reloading usually starts it."
      : "Notifications need the background worker, which `next dev` does not run. Try them against a build — `npm run build && npm start` — or on a deployed one. Email reaches you either way.",
  failed: "Could not turn notifications on. Email still reaches you.",
};

export function PushSetup() {
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

  if (enabled !== false || !pushIsSupported()) {
    return message ? (
      <p role="status" className="mt-4 text-sm text-muted">
        {message}
      </p>
    ) : null;
  }

  return (
    <section className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Get reminders on this phone</p>
          <p className="mt-0.5 text-sm text-muted">
            Lorem Ipsum.
          </p>
        </div>

        <Button variant="dark" onClick={turnOn} disabled={busy}>
          {busy ? "Turning on…" : "Turn on"}
        </Button>
      </div>

      {message && (
        <p role="status" className="mt-2 text-xs text-muted">
          {message}
        </p>
      )}

      {needsHomeScreenInstall() && (
        <p className="mt-2 text-xs text-muted">
          On iPhone, add FieldPulse to your home screen first — Safari only sends notifications to
          installed apps.
        </p>
      )}
    </section>
  );
}
