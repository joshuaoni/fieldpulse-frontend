"use client";

import { useState, type FormEvent } from "react";
import { secondsSince, useTicker } from "@/lib/use-elapsed";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { PositionSearchNotice, messageUnlessCancelled, usePositionSearch } from "./position-search";
import { useCheckIn, useCheckOut, useSubmitReport } from "../hooks";
import type { Visit, VisitAttendance } from "../types";
import { myAttendance } from "../types";
import { CameraCapture } from "./camera-capture";

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

function phaseLabel(phase: Phase, seconds: number): string {
  if (phase !== "saving") return "Getting your location…";
  // Counted, so a stalled upload is visibly a stalled upload.
  return seconds > 2 ? `Sending… ${seconds}s` : "Sending…";
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

/**
 * A check-in is two waits with nothing to tell them apart on screen: finding
 * the rep, then sending the photo. Naming only the first one meant that once
 * the location had been found, a slow upload went on claiming the phone was
 * still looking for satellites — which is where an afternoon of chasing a
 * geolocation bug that was really an upload came from.
 */
type Phase = "idle" | "locating" | "saving";

function CheckInStep({ visitId }: { visitId: string }) {
  const checkIn = useCheckIn();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heldPhoto, setHeldPhoto] = useState<Blob | null>(null);
  const position = usePositionSearch();
  const [sendingSince, setSendingSince] = useState(0);
  const busy = phase !== "idle";
  const sendingFor = secondsSince(sendingSince, useTicker(phase === "saving"));

  async function submit(photo: Blob) {
    setError(null);
    setPhase("locating");
    try {
      const { lat, lng } = await position.locate();
      setSendingSince(Date.now());
      setPhase("saving");
      await checkIn.mutateAsync({ visitId, lat, lng, photo });
      setHeldPhoto(null);
    } catch (cause) {
      // The photo is kept either way, so a cancelled or failed search costs
      // the rep the location only — never the trip back to the shop front.
      setHeldPhoto(photo);
      setError(messageUnlessCancelled(cause));
    } finally {
      setPhase("idle");
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
            {phase === "idle" ? "Try again" : phaseLabel(phase, sendingFor)}
          </Button>
          {position.searching && (
            <PositionSearchNotice seconds={position.seconds} onCancel={position.cancel} />
          )}
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
          {position.searching ? (
            <PositionSearchNotice seconds={position.seconds} onCancel={position.cancel} />
          ) : (
            busy && <p className="mt-3 text-sm text-muted">{phaseLabel(phase, sendingFor)}</p>
          )}
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
  const [phase, setPhase] = useState<Phase>("idle");
  const position = usePositionSearch();
  const [sendingSince, setSendingSince] = useState(0);
  const busy = phase !== "idle";
  const sendingFor = secondsSince(sendingSince, useTicker(phase === "saving"));

  async function onCheckOut() {
    setError(null);
    setPhase("locating");
    try {
      const { lat, lng } = await position.locate();
      setSendingSince(Date.now());
      setPhase("saving");
      await checkOut.mutateAsync({ visitId, lat, lng });
    } catch (cause) {
      setError(messageUnlessCancelled(cause));
    } finally {
      setPhase("idle");
    }
  }

  if (checkOut.data?.queued) return <QueuedNotice />;

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="text-sm font-medium">Check out</h2>
      <p className="mt-1 mb-3 text-sm text-muted">Do this as you leave the location.</p>
      <Button onClick={onCheckOut} disabled={busy} className="w-full">
        {phase === "idle" ? "Check out" : phaseLabel(phase, sendingFor)}
      </Button>
      {position.searching && (
        <PositionSearchNotice seconds={position.seconds} onCancel={position.cancel} />
      )}
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
