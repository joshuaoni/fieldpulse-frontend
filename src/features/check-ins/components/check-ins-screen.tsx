"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { pairLabel } from "@/lib/pairs";
import { useCheckIns } from "../hooks";
import { CheckInDetail } from "./check-in-detail";
import {
  STATUS_LABEL,
  describeConcerns,
  describeProgress,
  type CheckIn,
  type CheckInStatus,
} from "../types";

function thisWeek(): { from: string; to: string } {
  const monday = new Date();
  monday.setUTCHours(0, 0, 0, 0);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));

  const friday = new Date(monday);
  friday.setUTCDate(friday.getUTCDate() + 4);

  return { from: monday.toISOString(), to: friday.toISOString() };
}

const rangeLabel = ({ from, to }: { from: string; to: string }) => {
  const start = new Date(from);
  const end = new Date(to);
  const month = { month: "short" as const, day: "numeric" as const };

  return `${start.toLocaleDateString([], month)} – ${end.toLocaleDateString([], { ...month, year: "numeric" })}`;
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function CheckInsScreen() {
  const [range] = useState(thisWeek);
  const [status, setStatus] = useState<CheckInStatus | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isPending, isError, error } = useCheckIns({ ...range, status });
  const counts = data?.counts;
  const open = data?.checkIns.find((checkIn) => checkIn.attendanceId === openId) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <Breadcrumb segments={[{ label: "Check-ins" }]} />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Check-ins</h1>
        <p className="mt-1 text-sm text-muted">{rangeLabel(range)}</p>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <Tab
          label="All"
          count={counts?.all}
          active={!status}
          onClick={() => setStatus(undefined)}
        />
        <Tab
          label="Flagged"
          count={counts?.flagged}
          active={status === "FLAGGED"}
          onClick={() => setStatus("FLAGGED")}
        />
        <Tab
          label="Pending"
          count={counts?.pending}
          active={status === "PENDING"}
          onClick={() => setStatus("PENDING")}
        />
        <Tab
          label="Verified"
          count={counts?.verified}
          active={status === "VERIFIED"}
          onClick={() => setStatus("VERIFIED")}
        />
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load check-ins"}
        </p>
      )}

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {data && data.checkIns.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">
          {status
            ? `Nothing ${STATUS_LABEL[status].toLowerCase()} this week.`
            : "No check-ins recorded this week yet."}
        </p>
      )}

      {data && data.checkIns.length > 0 && (
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {data.checkIns.map((checkIn) => (
            <CheckInRow
              key={checkIn.attendanceId}
              checkIn={checkIn}
              onOpen={() => setOpenId(checkIn.attendanceId)}
            />
          ))}
        </ul>
      )}

      {open && <CheckInDetail checkIn={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function Tab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-9 rounded-full px-4 text-sm font-medium ${
        active
          ? "bg-sidebar-active-bg text-sidebar-active-foreground"
          : "bg-sunken text-muted hover:text-foreground"
      }`}
    >
      {label}
      {count === undefined ? "" : ` (${count})`}
    </button>
  );
}

const BADGE: Record<CheckInStatus, string> = {
  FLAGGED: "bg-danger/10 text-danger",
  PENDING: "bg-amber-500/10 text-amber-700",
  VERIFIED: "bg-success-bg text-success-fg",
};

function CheckInRow({ checkIn, onOpen }: { checkIn: CheckIn; onOpen: () => void }) {
  const flagged = checkIn.status === "FLAGGED";
  const detail = flagged ? describeConcerns(checkIn) : describeProgress(checkIn);

  const showsRep = (checkIn.pair?.members?.length ?? 0) > 1;

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-stretch gap-4 p-4 text-left hover:bg-sunken"
      >
        {checkIn.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={checkIn.photoUrl}
            alt=""
            className="min-h-20 w-24 shrink-0 self-stretch rounded-lg object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex min-h-20 w-24 shrink-0 self-stretch items-center justify-center rounded-lg bg-sunken text-[11px] text-muted">
            No photo
          </div>
        )}

        <div className="min-w-0 flex-1">
          <span
            className={`inline-flex rounded-md px-2 py-1 text-xs/none font-medium ${BADGE[checkIn.status]}`}
          >
            {STATUS_LABEL[checkIn.status]}
          </span>

          <p className="mt-2 truncate font-medium">
            {pairLabel(checkIn)}
            {showsRep && <span className="font-normal text-muted"> · {checkIn.rep.firstName}</span>}
          </p>

          <p className="flex items-baseline gap-2 text-sm text-muted">
            <span className="truncate">{checkIn.lead.address ?? checkIn.lead.companyName}</span>
            <span className="shrink-0 tabular-nums">{time(checkIn.checkInAt)}</span>
          </p>

          {detail && (
            <p className={`mt-1 text-sm ${flagged ? "text-danger" : "text-muted"}`}>{detail}</p>
          )}
        </div>
      </button>
    </li>
  );
}

