"use client";

import { useState } from "react";
import { Download, ListFilter, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { CHIP, CHIP_ON } from "@/components/ui/chip";
import { MemberAvatars } from "@/components/ui/member-avatars";
import { OUTCOME_LABEL, type VisitOutcome } from "@/lib/outcomes";
import { pairLabel } from "@/lib/pairs";
import { useExportReports, useReports, useTeamOverview } from "../hooks";
import {
  DATE_RANGE_LABEL,
  NO_FILTERS,
  filterCount,
  type FieldReport,
  type ReportFilters,
  type TeamMetric,
} from "../types";
import { ReportFiltersDialog } from "./report-filters";

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

export function ReportsScreen() {
  const [filters, setFilters] = useState<ReportFilters>(NO_FILTERS);
  const [search, setSearch] = useState("");
  const [filtering, setFiltering] = useState(false);

  const applied: ReportFilters = { ...filters, search: search.trim() || undefined };

  const overview = useTeamOverview(filters.range);
  const reports = useReports(applied, 1);
  const exporting = useExportReports();

  const chips = filterCount(filters);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <Breadcrumb segments={[{ label: "Reports" }]} />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">{DATE_RANGE_LABEL[filters.range]}</p>
      </header>

      <h2 className="mt-7 text-base font-semibold">Team overview</h2>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Total visits"
          metric={overview.data?.totalVisits}
          format={(value) => String(value)}
          icon="/icons/visits.svg"
        />
        <Stat
          label="Plan adherence"
          metric={overview.data?.planAdherence}
          format={(value) => `${value}%`}
          icon="/icons/plan.svg"
        />
        <Stat
          label="Conversion rate"
          metric={overview.data?.conversionRate}
          format={(value) => `${value}%`}
        />
        <Stat
          label="Average dwell time"
          metric={overview.data?.averageDwellMinutes}
          format={(value) => `${value}min`}
          icon="/icons/time-02.svg"
        />
      </div>

      {overview.isError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Could not work out the team&apos;s numbers.
        </p>
      )}

      <section className="mt-6 rounded-xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Field reports</h2>

          <Button
            variant="dark"
            onClick={() => exporting.mutate(applied)}
            disabled={exporting.isPending || reports.data?.reports.length === 0}
          >
            <Download size={18} aria-hidden />
            {exporting.isPending ? "Exporting…" : "Export report"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="flex h-9 w-56 shrink-0 items-center gap-2 rounded-lg border border-border px-3">
            <Search size={15} aria-hidden className="shrink-0 text-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
              aria-label="Search the reports"
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
              {filters.outcomes.map((outcome) => (
                <AppliedChip
                  key={outcome}
                  label={OUTCOME_LABEL[outcome]}
                  onRemove={() =>
                    setFilters({
                      ...filters,
                      outcomes: filters.outcomes.filter((held) => held !== outcome),
                    })
                  }
                />
              ))}

              {filters.sectors.map((sector) => (
                <AppliedChip
                  key={sector}
                  label={sector}
                  onRemove={() =>
                    setFilters({
                      ...filters,
                      sectors: filters.sectors.filter((held) => held !== sector),
                    })
                  }
                />
              ))}

              <button
                type="button"
                onClick={() => setFilters({ ...NO_FILTERS, range: filters.range })}
                className="text-sm text-muted hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            </>
          )}
        </div>

        {exporting.isError && (
          <p role="alert" className="mt-3 text-sm text-danger">
            Could not export the reports.
          </p>
        )}

        {reports.isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

        {reports.isError && (
          <p role="alert" className="mt-6 text-sm text-danger">
            Could not load the reports.
          </p>
        )}

        {reports.data?.reports.length === 0 && (
          <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted">
            No reports match what you are looking for.
          </p>
        )}

        {reports.data && reports.data.reports.length > 0 && (
          <ul className="mt-2 divide-y divide-border">
            {reports.data.reports.map((report) => (
              <ReportRow key={report.id} report={report} />
            ))}
          </ul>
        )}

        {reports.data && reports.data.pagination.totalPages > 1 && (
          <p className="mt-4 text-sm text-muted">
            Showing {reports.data.reports.length} of {reports.data.pagination.totalItems}
          </p>
        )}
      </section>

      {filtering && (
        <ReportFiltersDialog
          filters={filters}
          sectors={reports.data?.sectors ?? []}
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

function Stat({
  label,
  metric,
  format,
  icon,
}: {
  label: string;
  metric?: TeamMetric;
  format: (value: number) => string;
  icon?: string;
}) {
  const change = metric && metric.previous !== null ? metric.value - metric.previous : null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-2xl font-semibold">
          {metric ? format(metric.value) : "—"}

          {change !== null && change !== 0 && (
            <span
              title={`${change > 0 ? "Up" : "Down"} from ${format(metric!.previous!)} the period before`}
              className={change > 0 ? "text-success-fg" : "text-danger"}
            >
              {change > 0 ? (
                <TrendingUp size={20} aria-hidden />
              ) : (
                <TrendingDown size={20} aria-hidden />
              )}
            </span>
          )}
        </p>

        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" aria-hidden className="size-8 shrink-0" />
        )}
      </div>
    </div>
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

const OUTCOME_TONE: Record<VisitOutcome, string> = {
  INTERESTED: "bg-success-bg text-success-fg",
  CLOSED: "bg-success-bg text-success-fg",
  FOLLOW_UP_NEEDED: "bg-amber-500/10 text-amber-700",
  NOT_VIABLE: "bg-danger/10 text-danger",
  OTHER: "bg-sunken text-muted",
};

function ReportRow({ report }: { report: FieldReport }) {
  return (
    <li className="py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold">{report.lead.companyName}</p>

        {report.outcome && (
          <span
            className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs/none font-medium ${OUTCOME_TONE[report.outcome]}`}
          >
            {OUTCOME_LABEL[report.outcome]}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted">{report.notes}</p>

      {report.flagged && (
        <p className="mt-1 text-sm text-danger">Check-in location queried</p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted">
        <span className="flex min-w-0 items-center gap-2">
          <MemberAvatars users={report.pair.members.map((member) => member.user)} />
          <span className="truncate">
            {pairLabel({ pairId: report.pair.id, pair: report.pair })}
          </span>
        </span>
        <span className="shrink-0">{day(report.submittedAt)}</span>
      </div>
    </li>
  );
}
