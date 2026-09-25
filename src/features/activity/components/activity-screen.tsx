"use client";

import { useState } from "react";
import { ListFilter, Search, X } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { CHIP, CHIP_ON } from "@/components/ui/chip";
import { useActivity } from "../hooks";
import {
  ENTITY_LABEL,
  NO_ACTIVITY_FILTERS,
  actionLabel,
  activityFilterCount,
  actorName,
  type ActivityEvent,
  type ActivityFilters,
} from "../types";
import { ActivityFiltersDialog } from "./activity-filters";

const PAGE_SIZE = 50;

function when(iso: string): string {
  const at = new Date(iso);
  const midnight = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const days = Math.round((midnight(new Date()) - midnight(at)) / 86_400_000);
  const day =
    days === 0
      ? "Today"
      : days === 1
        ? "Yesterday"
        : at.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time}`;
}

export function ActivityScreen() {
  const [filters, setFilters] = useState<ActivityFilters>(NO_ACTIVITY_FILTERS);
  const [search, setSearch] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [filtering, setFiltering] = useState(false);

  const applied: ActivityFilters = { ...filters, search: search.trim() || undefined };
  const { data, isPending, isError, isFetching } = useActivity(applied, shown);

  const chips = activityFilterCount(filters);
  const total = data?.pagination.totalItems ?? 0;
  const events = data?.events ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
      <Breadcrumb segments={[{ label: "Activity log" }]} />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="mt-1 text-sm text-muted">
          A record of everything that has happened across FieldPulse. Nothing here can be edited
          or removed.
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-72 shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={15} aria-hidden className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by activity or person"
            aria-label="Search the activity log"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        <button
          type="button"
          onClick={() => setFiltering(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-control-edge px-3 text-sm font-medium hover:bg-sidebar-hover-bg"
        >
          <ListFilter size={15} aria-hidden />
          Filter
          {chips > 0 && <span className="text-muted">({chips})</span>}
        </button>

        {chips > 0 && (
          <>
            {filters.entityTypes.map((entityType) => (
              <AppliedChip
                key={entityType}
                label={ENTITY_LABEL[entityType] ?? entityType}
                onRemove={() =>
                  setFilters({
                    ...filters,
                    entityTypes: filters.entityTypes.filter((held) => held !== entityType),
                  })
                }
              />
            ))}

            {filters.actions.map((action) => (
              <AppliedChip
                key={action}
                label={actionLabel(action)}
                onRemove={() =>
                  setFilters({
                    ...filters,
                    actions: filters.actions.filter((held) => held !== action),
                  })
                }
              />
            ))}

            <button
              type="button"
              onClick={() => setFilters(NO_ACTIVITY_FILTERS)}
              className="text-sm text-muted hover:text-foreground hover:underline"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Could not load the activity log.
        </p>
      )}

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {data && events.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">
          {chips > 0 || search
            ? "Nothing matches what you are looking for."
            : "Nothing has happened yet. Activity will appear here as it does."}
        </p>
      )}

      {events.length > 0 && (
        <ul className="mt-5 divide-y divide-border-strong overflow-hidden rounded-xl border border-border bg-surface px-5">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </ul>
      )}

      {events.length < total && (
        <div className="mt-5 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShown((count) => count + PAGE_SIZE)}
            disabled={isFetching}
          >
            {isFetching ? "Loading…" : `Load more (${total - events.length} left)`}
          </Button>
        </div>
      )}

      {filtering && (
        <ActivityFiltersDialog
          filters={filters}
          actions={data?.actions ?? []}
          onApply={(next) => {
            setFilters(next);
            setFiltering(false);
          }}
          onClose={() => setFiltering(false)}
        />
      )}
    </div>
  );
}

function EventRow({ event }: { event: ActivityEvent }) {
  return (
    <li className="py-5">
      <div className="flex items-start justify-between gap-4">
        <p className="min-w-0 text-[15px]">
          <span className="font-semibold">{actionLabel(event.action)}</span>
          <span aria-hidden className="mx-2 text-xl leading-none font-bold text-muted">
            ·
          </span>
          <span className="font-medium">{actorName(event.actor)}</span>
        </p>

        <span className="shrink-0 text-[13px] whitespace-nowrap text-sidebar-section-label">
          {when(event.occurredAt)}
        </span>
      </div>

      <p className="mt-1 text-sm text-muted">
        {event.subject ?? (
          <span className="italic">
            {ENTITY_LABEL[event.entityType] ?? event.entityType} · no longer exists
          </span>
        )}
      </p>

      {event.comments && (
        <p className="mt-3 rounded-md border-l-[3px] border-foreground bg-sunken px-4 py-3 text-sm">
          {event.comments}
        </p>
      )}
    </li>
  );
}

function AppliedChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className={`${CHIP} ${CHIP_ON}`}>
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="text-muted hover:text-foreground"
      >
        <X size={14} aria-hidden />
      </button>
    </span>
  );
}
