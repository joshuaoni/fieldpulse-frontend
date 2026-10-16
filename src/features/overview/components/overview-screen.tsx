"use client";

import { useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { MemberAvatars } from "@/components/ui/member-avatars";
import { StatCard } from "@/components/ui/stat-card";
import { usePairs } from "@/features/pairs/hooks";
import { openMembers, type SalesPair } from "@/features/pairs/types";
import { useReports, useTeamOverview } from "@/features/reports/hooks";
import { NO_FILTERS, type FieldReport } from "@/features/reports/types";
import { OUTCOME_LABEL, OUTCOME_TONE } from "@/lib/outcomes";
import { pairLabel } from "@/lib/pairs";
import { useSession } from "@/lib/session";
import { useCheckIns } from "@/features/check-ins/hooks";
import { useTeamVisits } from "@/features/visits/hooks";
import { VisitDetailModal } from "@/features/visits/components/visit-detail-modal";
import { FieldPulseLoader } from "@/components/ui/fieldpulse-loader";
import {
  ATTENTION_BADGE,
  ATTENTION_LABEL,
  dayTotals,
  hasStarted,
  needsAttention,
  type AttentionItem,
} from "../attention";

/** The window the attention panel asks about: a missed visit is never today. */
function lastWeek(): { from: string; to: string } {
  const to = new Date();
  to.setHours(0, 0, 0, 0);
  to.setDate(to.getDate() + 1);

  const from = new Date(to);
  from.setDate(from.getDate() - 7);

  return { from: from.toISOString(), to: to.toISOString() };
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const day = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });

export function OverviewScreen() {
  const { user } = useSession();
  const [since] = useState(lastWeek);
  const [openVisitId, setOpenVisitId] = useState<string | null>(null);

  const pairs = usePairs();
  const metrics = useTeamOverview("TODAY");
  const reports = useReports(NO_FILTERS, 1);
  const flagged = useCheckIns({ ...since, status: "FLAGGED" });
  const missed = useTeamVisits({ ...since, status: "MISSED", pageSize: 50 });

  const roster = (pairs.data ?? []).filter((pair) => pair.isActive);
  const out = roster.filter(hasStarted);
  const visits = dayTotals(roster);

  const attention = needsAttention({
    flagged: flagged.data?.checkIns ?? [],
    visits: missed.data?.visits ?? [],
  });

  const conversion = metrics.data?.conversionRate;
  const conversionUp =
    conversion && conversion.previous !== null && conversion.value > conversion.previous;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hello, {user?.firstName ?? "there"} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s how your field teams are doing today.</p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active pairs"
          value={pairs.data ? `${out.length} / ${roster.length}` : "—"}
          icon={<Users size={30} aria-hidden className="shrink-0 text-accent" />}
        />
        <StatCard
          label="Visits today"
          value={pairs.data ? `${visits.done} / ${visits.total}` : "—"}
          icon="/icons/visits.svg"
        />
        <StatCard
          label="Plan adherence"
          value={metrics.data ? `${metrics.data.planAdherence.value}%` : "—"}
          icon="/icons/plan.svg"
        />
        <StatCard
          label="Conversion rate"
          value={conversion ? `${conversion.value}%` : "—"}
          tone={conversionUp ? "good" : undefined}
          trend={
            conversionUp
              ? { direction: "up", title: `Up from ${conversion!.previous}% yesterday` }
              : null
          }
        />
      </div>

      {pairs.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load the pairs.
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <Panel title="Active reps" href="/manager/pairs">
            {pairs.isPending && <FieldPulseLoader className="p-5 pt-0" />}

            {pairs.data && out.length === 0 && (
              <p className="p-5 pt-0 text-sm text-muted">Nobody has started their day yet.</p>
            )}

            <ul className="divide-y divide-border">
              {out.map((pair) => (
                <ActiveRep key={pair.id} pair={pair} onOpenVisit={setOpenVisitId} />
              ))}
            </ul>
          </Panel>

          <Panel title="Recent reports" href="/manager/reports">
            {reports.isPending && <FieldPulseLoader className="p-5 pt-0" />}

            {reports.data && reports.data.reports.length === 0 && (
              <p className="p-5 pt-0 text-sm text-muted">No visits have been written up yet.</p>
            )}

            <ul className="divide-y divide-border">
              {(reports.data?.reports ?? []).slice(0, 5).map((report) => (
                <RecentReport key={report.id} report={report} onOpenVisit={setOpenVisitId} />
              ))}
            </ul>
          </Panel>
        </div>

        <Panel title="Needs attention" href="/manager/check-ins">
          {(flagged.isPending || missed.isPending) && (
            <FieldPulseLoader className="p-5 pt-0" />
          )}

          {(flagged.isError || missed.isError) && (
            <p role="alert" className="p-5 pt-0 text-sm text-danger">
              Could not check for flagged or missed visits.
            </p>
          )}

          {flagged.data && missed.data && attention.length === 0 && (
            <p className="p-5 pt-0 text-sm text-muted">
              Nothing flagged or missed in the past week.
            </p>
          )}

          <ul className="divide-y divide-border">
            {attention.slice(0, 6).map((item) => (
              <Attention key={item.id} item={item} onOpenVisit={setOpenVisitId} />
            ))}
          </ul>

          {attention.length > 6 && (
            <p className="px-5 pb-4 text-sm text-muted">
              and {attention.length - 6} more in the past week
            </p>
          )}
        </Panel>
      </div>

      {openVisitId && (
        <VisitDetailModal visitId={openVisitId} onClose={() => setOpenVisitId(null)} />
      )}
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        {href && (
          <Link
            href={href}
            className="inline-flex min-h-9 items-center rounded-lg border border-control-edge bg-surface px-3.5 text-sm font-medium hover:bg-sidebar-hover-bg"
          >
            View all
          </Link>
        )}
      </div>

      {children}
    </section>
  );
}

function ActiveRep({
  pair,
  onOpenVisit,
}: {
  pair: SalesPair;
  onOpenVisit: (visitId: string) => void;
}) {
  const { done, total } = pair.day.progress;
  const complete = total > 0 && done === total;

  return (
    <li className="flex items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <MemberAvatars users={openMembers(pair).map((member) => member.user)} />
          <p className="min-w-0 truncate font-medium">{pairLabel({ pairId: pair.id, pair })}</p>
        </div>

        <p className="mt-1 truncate text-sm">
          {pair.day.current ? (
            <button
              type="button"
              onClick={() => onOpenVisit(pair.day.current!.visitId)}
              className="hover:underline"
            >
              {pair.day.current.companyName}
            </button>
          ) : (
            <span className="text-muted">Between stops</span>
          )}
          {pair.day.current?.address && (
            <span className="text-muted"> ({pair.day.current.address})</span>
          )}
        </p>
      </div>

      <span
        className={`shrink-0 rounded-md px-2.5 py-1 text-xs/none font-medium ${
          complete ? "bg-success-bg text-success-fg" : "bg-chip-active-bg text-chip-active-edge"
        }`}
      >
        {done} of {total} completed
      </span>
    </li>
  );
}

function Attention({
  item,
  onOpenVisit,
}: {
  item: AttentionItem;
  onOpenVisit: (visitId: string) => void;
}) {
  return (
    <li className="flex items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpenVisit(item.visitId)}
          className="block max-w-full truncate text-left font-medium hover:underline"
        >
          {item.title}
        </button>
        <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
        <p className="mt-0.5 text-xs text-muted">{day(item.at)}</p>
      </div>

      <span
        className={`shrink-0 rounded-md px-2.5 py-1 text-xs/none font-medium ${ATTENTION_BADGE[item.kind]}`}
      >
        {ATTENTION_LABEL[item.kind]}
      </span>
    </li>
  );
}

function RecentReport({
  report,
  onOpenVisit,
}: {
  report: FieldReport;
  onOpenVisit: (visitId: string) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpenVisit(report.visitId)}
          className="block max-w-full truncate text-left font-medium hover:underline"
        >
          {report.lead.companyName}
        </button>
        <p className="mt-0.5 truncate text-sm text-muted">
          {pairLabel({ pairId: report.pair.id, pair: report.pair })} · {day(report.submittedAt)} at {time(report.submittedAt)}
        </p>
      </div>

      {report.outcome && (
        <span
          className={`shrink-0 rounded-md px-2.5 py-1 text-xs/none font-medium ${OUTCOME_TONE[report.outcome]}`}
        >
          {OUTCOME_LABEL[report.outcome]}
        </span>
      )}
    </li>
  );
}
