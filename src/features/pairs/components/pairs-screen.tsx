"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { pairLabel } from "@/lib/pairs";
import { usePairs } from "../hooks";
import { matchesRep, openMembers, type SalesPair } from "../types";
import { MemberAvatars } from "./member-avatars";
import { PairingForm } from "./pairing-form";

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function shiftDays(day: Date, by: number): Date {
  const moved = new Date(day);
  moved.setUTCDate(moved.getUTCDate() + by);
  return moved;
}

const asParam = (day: Date) => day.toISOString().slice(0, 10);

const dayLabel = (day: Date) =>
  day.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

type Editing = { pair?: SalesPair } | null;

export function PairsScreen() {
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<Editing>(null);

  const today = startOfDay(new Date());
  const isToday = day.getTime() === today.getTime();

  const { data: pairs, isPending, isError, error } = usePairs(asParam(day));

  const shown = useMemo(
    () => (pairs ?? []).filter((pair) => matchesRep(pair, term)),
    [pairs, term],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <Breadcrumb segments={[{ label: "Reps & Pairs" }]} />

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reps &amp; pairs</h1>
          <p className="mt-1 text-sm text-muted">
            {isToday && <span className="font-medium text-foreground">Today · </span>}
            {dayLabel(day)}
          </p>
        </div>

        <Button variant="dark" onClick={() => setEditing({})}>
          <Plus size={18} aria-hidden />
          Add a new pair
        </Button>
      </header>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={15} aria-hidden className="shrink-0 text-muted" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by rep name"
            aria-label="Search by rep name"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex items-center gap-1.5">
          <DayStep label="Previous day" onClick={() => setDay(shiftDays(day, -1))}>
            <ChevronLeft size={16} aria-hidden />
          </DayStep>
          <DayStep label="Next day" onClick={() => setDay(shiftDays(day, 1))}>
            <ChevronRight size={16} aria-hidden />
          </DayStep>

          {!isToday && (
            <button
              type="button"
              onClick={() => setDay(today)}
              className="ml-1 h-9 rounded-lg px-2 text-sm font-medium text-brand hover:underline"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load the pairs"}
        </p>
      )}

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {pairs && shown.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          {pairs.length ? `No pair has a rep matching "${term}".` : "No pairs yet."}
        </p>
      )}

      {shown.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-muted">
                <th scope="col" className="px-5 py-3">
                  Pairs
                </th>
                <th scope="col" className="px-5 py-3">
                  Area
                </th>
                <th scope="col" className="px-5 py-3">
                  Current
                </th>
                <th scope="col" className="px-5 py-3">
                  Progress
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {shown.map((pair) => (
                <PairRow key={pair.id} pair={pair} onEdit={() => setEditing({ pair })} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PairingForm pair={editing.pair} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DayStep({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-control-edge bg-surface text-muted hover:bg-sidebar-hover-bg hover:text-foreground"
    >
      {children}
    </button>
  );
}

function PairRow({ pair, onEdit }: { pair: SalesPair; onEdit: () => void }) {
  const { current, progress, week } = pair.day;
  const users = openMembers(pair).map((member) => member.user);
  const label = pairLabel({ pairId: pair.id, pair });

  const finished = !current && progress.total > 0;

  return (
    <tr>
      <td className="px-5 py-4">
        <span className="flex items-center gap-3">
          <MemberAvatars users={users} />
          <span className="font-medium">{label}</span>
        </span>
      </td>

      <td className="px-5 py-4 text-muted">{current?.address ?? "—"}</td>

      <td className="px-5 py-4 text-muted">
        {current?.companyName ?? (finished ? "Day complete" : "Not planned")}
      </td>

      <td className="px-5 py-4">
        {progress.total ? (
          <span className="inline-flex rounded-md bg-amber-500/10 px-2.5 py-1 text-xs/none font-medium text-amber-700">
            {progress.done} of {progress.total}
          </span>
        ) : (
          <span className="text-muted">Nothing that day</span>
        )}

        {week.total > 0 && (
          <p className="mt-1.5 text-xs text-muted">
            {week.done} of {week.total} this week
          </p>
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label}`}
          className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-foreground"
        >
          <Pencil size={16} aria-hidden />
        </button>
      </td>
    </tr>
  );
}
