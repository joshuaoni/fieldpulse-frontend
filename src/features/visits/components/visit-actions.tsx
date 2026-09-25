"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { RotateCcw } from "lucide-react";
import { CHIP, CHIP_OFF } from "@/components/ui/chip";
import { OUTCOMES, OUTCOME_LABEL, type VisitOutcome } from "@/lib/outcomes";
import { getCurrentPosition, isCancelled, type Fix } from "@/lib/geolocation";
import { secondsSince, useTicker } from "@/lib/use-elapsed";
import { messageUnlessCancelled } from "./position-search";
import { arrivedAt } from "../time";
import { useCheckIn, useCheckOut, useQueuedFor, useSubmitReport } from "../hooks";
import { myAttendance, type SubmittedReport, type Visit, type VisitAttendance } from "../types";
import { CameraCapture } from "./camera-capture";

function message(error: unknown): string {
  if (isCancelled(error)) return "Cancelled.";
  return error instanceof Error ? error.message : "Something went wrong.";
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export function VisitActions({
  visit,
  repId,
  onSubmitted,
}: {
  visit: Visit;
  repId: string;
  onSubmitted: (result: { queued: boolean }) => void;
}) {
  const mine = myAttendance(visit, repId);
  const queued = useQueuedFor(visit.id);

  /**
   * Anything sitting in the queue has happened as far as the rep is concerned
   * — the server has simply not heard about it yet. Reading it here is what
   * stops the screen offering a step that is already recorded: without it a
   * check-in taken offline left the button live, and one arrival became
   * twelve queued check-ins.
   */
  const checkedIn = Boolean(mine?.checkInAt) || queued.has("check-in");
  const checkedOut = Boolean(mine?.checkOutAt) || queued.has("check-out");

  if (!checkedIn) return <CheckInStep visitId={visit.id} repId={repId} />;

  if (!checkedOut) {
    return (
      <CheckOutStep
        visitId={visit.id}
        repId={repId}
        attendance={mine}
        visitCreatedAt={visit.createdAt}
        arrivalQueued={queued.has("check-in")}
      />
    );
  }

  if (visit.report) return <AlreadyReported report={visit.report} repId={repId} />;
  if (queued.has("report")) return <ReportQueued />;

  return <ReportStep visitId={visit.id} onSubmitted={onSubmitted} />;
}

/**
 * The device's own reading of where it is.
 */
function usePositionLock() {
  const [state, setState] = useState(() => ({
    fix: null as Fix | null,
    error: null as string | null,
    searching: true,
    startedAt: Date.now(),
  }));

  const abort = useRef<AbortController | null>(null);
  const attempt = useRef(0);

  const seconds = secondsSince(state.startedAt, useTicker(state.searching));

  const search = useCallback(() => {
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;

    const mine = ++attempt.current;

    getCurrentPosition({ signal: controller.signal })
      .then((found) => {
        // A late answer from a search already replaced must not win.
        if (mine === attempt.current) setState((held) => ({ ...held, fix: found, error: null, searching: false }));
      })
      .catch((cause) => {
        if (mine === attempt.current) {
          setState((held) => ({
            ...held,
            fix: null,
            error: messageUnlessCancelled(cause),
            searching: false,
          }));
        }
      });
  }, []);

  useEffect(() => {
    search();
    return () => abort.current?.abort();
  }, [search]);

  return {
    ...state,
    seconds,
    ready: state.fix !== null,
    retry: () => {
      setState({ fix: null, error: null, searching: true, startedAt: Date.now() });
      search();
    },
    cancel: () => abort.current?.abort(),
  };
}

function GpsStatus({
  lock,
}: {
  lock: ReturnType<typeof usePositionLock>;
}) {
  if (lock.fix) {
    return (
      <div className="mt-4 flex items-start gap-3">
        <span
          aria-hidden
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-success-bg"
        >
          <span className="size-2 rounded-full bg-success-fg" />
        </span>
        <div>
          <p className="text-sm font-medium text-success-fg">GPS Ready</p>
          {lock.fix.accuracyM !== null && (
            <p className="text-sm text-muted">Accuracy: {lock.fix.accuracyM}m</p>
          )}
        </div>
      </div>
    );
  }

  if (lock.searching) {
    return (
      <div role="status" className="mt-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-foreground"
          />
          <div>
            <p className="text-sm font-medium">Capturing location… {lock.seconds}s</p>
            <p className="text-sm text-muted">
              Please hold steady while GPS improves accuracy. The first fix can take a minute —
              stand where you can see the sky.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={lock.cancel}
          className="mt-3 min-h-11 text-sm font-medium text-muted underline"
        >
          Stop searching
        </button>
      </div>
    );
  }

  // Given up on, or failed. Either way the only way forward is to ask again.
  return (
    <div className="mt-4">
      <p role={lock.error ? "alert" : undefined} className="text-sm text-danger">
        {lock.error ?? "No location yet."} A position is needed before you can go on.
      </p>
      <button
        type="button"
        onClick={lock.retry}
        className="mt-2 min-h-11 text-sm font-medium underline"
      >
        Search again
      </button>
    </div>
  );
}

/**
 * How long a send has been going.
 *
 * Restored deliberately: a silent button during a slow upload is how an
 * afternoon once went on chasing a geolocation bug that was really a photo
 * crawling up a bad connection.
 */
function useSending() {
  const [since, setSince] = useState(0);
  const running = since !== 0;
  const seconds = secondsSince(since, useTicker(running));

  return {
    running,
    label: (verb: string) => (seconds > 2 ? `${verb}… ${seconds}s` : `${verb}…`),
    start: () => setSince(Date.now()),
    stop: () => setSince(0),
  };
}

/**
 * Saved on this device, not yet accepted by the server.
 *
 * The action counts as done — the rep may walk on — but the visit will not
 * move until the queue drains, so the screen has to say why it still looks
 * the same.
 */
function QueuedNotice({ what }: { what: string }) {
  return (
    <p role="status" className="mt-4 rounded-xl border border-border bg-sunken px-4 py-3 text-sm">
      Your {what} is saved on this phone and will sync when you have a connection. You can carry
      on.
    </p>
  );
}

/** A dark, full-width action, the way the phone screens end. */
function PrimaryAction({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  return (
    // Fixed rather than sticky: it should sit at the foot of the screen even
    // when the content above it is short, which is most of this flow.
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-lg bg-background px-4 pt-3 pb-[max(1.75rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
      <button
        type="button"
        {...props}
        className="h-13 w-full rounded-full bg-sidebar-active-bg text-base font-medium text-sidebar-active-foreground disabled:opacity-40"
      >
        {children}
      </button>
    </div>
  );
}

/**
 * Arrival: a photo and a position, and nothing recorded until both are in
 * hand.
 *
 * No time is shown before checking in. The arrival time is stamped by the
 * server, so any clock shown here would be the phone's own and might not be
 * what ends up on the record.
 */
function CheckInStep({ visitId, repId }: { visitId: string; repId: string }) {
  const checkIn = useCheckIn();
  const position = usePositionLock();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useSending();

  // Derived rather than stored, so nothing is set from inside an effect;
  // the effect only releases it, since an object URL pins the photo in
  // memory until it is revoked.
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function submit() {
    if (!photo || !position.fix) return;

    setError(null);
    setBusy(true);
    sending.start();
    try {
      await checkIn.mutateAsync({
        visitId,
        repId,
        lat: position.fix.lat,
        lng: position.fix.lng,
        accuracyM: position.fix.accuracyM,
        photo,
      });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      sending.stop();
    }
  }

  return (
    <section>
      {preview ? (
        <div className="rounded-2xl border border-dashed border-control-edge p-3">
          {/* A blob taken on this phone; there is nothing for a loader to do. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="The photo you just took" className="w-full rounded-xl" />

          <button
            type="button"
            onClick={() => setPhoto(null)}
            disabled={busy}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-muted text-sm font-medium"
          >
            <RotateCcw size={15} aria-hidden />
            Retake Photo
          </button>
        </div>
      ) : (
        <CameraCapture onCapture={setPhoto} disabled={busy} />
      )}

      <GpsStatus lock={position} />

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {checkIn.data?.queued && <QueuedNotice what="check-in" />}

      <PrimaryAction onClick={submit} disabled={!photo || !position.ready || busy}>
        {busy ? sending.label("Checking in") : "Check in"}
      </PrimaryAction>
    </section>
  );
}

/**
 * Departure: the arrival photo shown back, the position taken again, and the
 * time the server recorded on arrival.
 */
function CheckOutStep({
  visitId,
  repId,
  attendance,
  visitCreatedAt,
  arrivalQueued,
}: {
  visitId: string;
  repId: string;
  attendance: VisitAttendance | undefined;
  visitCreatedAt: string;
  arrivalQueued: boolean;
}) {
  const checkOut = useCheckOut();
  const position = usePositionLock();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useSending();

  const arrival = attendance ? arrivedAt(attendance, visitCreatedAt) : null;

  async function submit() {
    if (!position.fix) return;

    setError(null);
    setBusy(true);
    sending.start();
    try {
      await checkOut.mutateAsync({
        visitId,
        repId,
        lat: position.fix.lat,
        lng: position.fix.lng,
        accuracyM: position.fix.accuracyM,
      });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      sending.stop();
    }
  }

  return (
    <section>
      {/* No photo and no arrival time to show back: both are on this phone,
          waiting to go up. Saying so beats an empty panel. */}
      {arrivalQueued && <QueuedNotice what="check-in" />}

      {attendance?.checkInPhotoUrl && (
        <figure className="overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attendance.checkInPhotoUrl}
            alt="The photo taken when you arrived"
            className="w-full"
          />
          <figcaption className="bg-sunken px-4 py-3">
            <p className="text-sm font-medium">Image Uploaded</p>
            <p className="text-sm text-muted">Taken when you checked in</p>
          </figcaption>
        </figure>
      )}

      <GpsStatus lock={position} />

      {arrival && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p className="text-sm font-medium">Check in Time:</p>
          {/* When the rep arrived, not when the queue drained — those are the
              same moment only when there was a signal at the door. */}
          <p className="text-sm text-muted tabular-nums">{time(arrival)}</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {checkOut.data?.queued && <QueuedNotice what="check-out" />}

      <PrimaryAction onClick={submit} disabled={!position.ready || busy}>
        {busy ? sending.label("Checking out") : "Check Out"}
      </PrimaryAction>
    </section>
  );
}

function ReportStep({
  visitId,
  onSubmitted,
}: {
  visitId: string;
  onSubmitted: (result: { queued: boolean }) => void;
}) {
  const submitReport = useSubmitReport();
  const [outcome, setOutcome] = useState<VisitOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await submitReport.mutateAsync({
        visitId,
        notes,
        outcome: outcome ?? undefined,
      });
      onSubmitted({ queued: result.queued });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <fieldset>
        <legend className="font-medium">Outcome</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {OUTCOMES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setOutcome((chosen) => (chosen === value ? null : value))}
              aria-pressed={outcome === value}
              className={`${CHIP} rounded-full px-4 py-2 ${
                outcome === value
                  ? "border-sidebar-active-bg bg-sidebar-active-bg text-sidebar-active-foreground"
                  : CHIP_OFF
              }`}
            >
              {OUTCOME_LABEL[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-7 block font-medium" htmlFor="notes">
        Notes
      </label>
      <textarea
        id="notes"
        required
        rows={4}
        maxLength={5000}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="What did they say? What's next?"
        className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none placeholder:text-sidebar-section-label focus:border-chip-active-edge"
      />

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      {submitReport.data?.queued && <QueuedNotice what="report" />}

      <PrimaryAction type="submit" disabled={busy || !notes.trim()}>
        {busy ? "Submitting…" : "Submit Report"}
      </PrimaryAction>
    </form>
  );
}

/**
 * Written up, but only here so far.
 *
 * There is no report to show back — it has no id and no accepted time until
 * the server takes it — so this says where it stands instead of offering the
 * form a second time.
 */
function ReportQueued() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Visit written up</h2>
      <p className="mt-1 text-sm text-muted">
        Your report is saved on this phone and will sync when you have a connection. There is
        nothing left to do here.
      </p>
    </section>
  );
}

function AlreadyReported({ report, repId }: { report: SubmittedReport; repId: string }) {
  const mine = report.attendance?.rep?.id === repId;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-medium">Visit written up</h2>
      <p className="mt-1 text-sm text-muted">
        {mine
          ? "You wrote this visit up."
          : `${report.attendance?.rep?.firstName ?? "Your partner"} wrote this visit up.`}
      </p>
      {report.notes && <p className="mt-3 text-sm">{report.notes}</p>}
    </section>
  );
}
