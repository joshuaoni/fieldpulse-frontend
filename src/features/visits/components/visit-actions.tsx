"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { getCurrentPosition } from "@/lib/geolocation";
import { useCheckIn, useCheckOut, useSubmitReport } from "../hooks";
import type { Visit, VisitAttendance } from "../types";
import { myAttendance } from "../types";
import { CameraCapture } from "./camera-capture";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

/**
 * The calling rep's next step for this visit. Driven by *their own* attendance.
 */
export function VisitActions({ visit, repId }: { visit: Visit; repId: string }) {
  const mine: VisitAttendance | undefined = myAttendance(visit, repId);

  if (!mine?.checkInAt) return <CheckInStep visitId={visit.id} />;
  if (!mine.checkOutAt) return <CheckOutStep visitId={visit.id} />;
  if (!mine.report) return <ReportStep visitId={visit.id} />;
  return null;
}

function QueuedNotice() {
  return (
    <p role="status" className="mt-3 text-sm text-brand">
      Saved on this device. It will sync when you have a connection.
    </p>
  );
}

function CheckInStep({ visitId }: { visitId: string }) {
  const checkIn = useCheckIn();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [heldPhoto, setHeldPhoto] = useState<Blob | null>(null);

  async function submit(photo: Blob) {
    setError(null);
    setBusy(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      await checkIn.mutateAsync({ visitId, lat, lng, photo });
      setHeldPhoto(null);
    } catch (cause) {
      setHeldPhoto(photo);
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  if (checkIn.data?.queued) return <QueuedNotice />;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Check in</h2>
      <p className="mt-1 mb-3 text-sm text-muted">
        Take a photo at the location. Your arrival time is recorded by the server, not by this
        phone. Your partner checks in separately.
      </p>

      {heldPhoto ? (
        <>
          <p className="text-sm text-muted">Your photo is saved. Only the location is missing.</p>
          <Button onClick={() => submit(heldPhoto)} disabled={busy} className="mt-3 w-full">
            {busy ? "Getting your location…" : "Try again"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setHeldPhoto(null);
              setError(null);
            }}
            disabled={busy}
            className="mt-2 w-full"
          >
            Take a different photo
          </Button>
        </>
      ) : (
        <>
          <CameraCapture onCapture={submit} disabled={busy} />
          {busy && <p className="mt-3 text-sm text-muted">Getting your location…</p>}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function CheckOutStep({ visitId }: { visitId: string }) {
  const checkOut = useCheckOut();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCheckOut() {
    setError(null);
    setBusy(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      await checkOut.mutateAsync({ visitId, lat, lng });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  if (checkOut.data?.queued) return <QueuedNotice />;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Check out</h2>
      <p className="mt-1 mb-3 text-sm text-muted">Do this as you leave the location.</p>
      <Button onClick={onCheckOut} disabled={busy} className="w-full">
        {busy ? "Checking out…" : "Check out"}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function ReportStep({ visitId }: { visitId: string }) {
  const submitReport = useSubmitReport();
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await submitReport.mutateAsync({ visitId, notes, outcome: outcome || undefined });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  if (submitReport.data?.queued) return <QueuedNotice />;

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Your report</h2>
      <p className="mt-1 text-sm text-muted">
        Your own account of the visit. Your partner writes theirs separately.
      </p>

      <label className="mt-3 block text-sm font-medium" htmlFor="notes">
        What happened?
      </label>
      <textarea
        id="notes"
        required
        rows={5}
        maxLength={5000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand"
      />

      <TextField
        id="outcome"
        label="Outcome (optional)"
        placeholder="interested / no decision-maker present"
        maxLength={200}
        value={outcome}
        onChange={(event) => setOutcome(event.target.value)}
        className="mt-4"
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={busy} className="mt-4 w-full">
        {busy ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
