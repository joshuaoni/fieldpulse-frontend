"use client";

import { useState } from "react";
import { Eye, RotateCw, Search } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEnrichmentPreview, useLeads, useRunEnrichment } from "../hooks";
import { sourcesOf, type DiscoverySummary, type Lead } from "../types";
import { BADGE, SourceChips, StateBadge } from "./lead-badges";
import { LeadDetail } from "./lead-detail";
import { SearchTargetsTab } from "./search-targets-tab";

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`;
};

const arrivedOn = (iso: string) =>
  new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const bookedFor = (iso: string) =>
  new Date(iso).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

type Tab = "leads" | "targets";

export function LeadsScreen() {
  const [tab, setTab] = useState<Tab>("leads");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <Breadcrumb segments={[{ label: "Leads" }]} />

      {tab === "leads" ? <LeadsTab tab={tab} onTab={setTab} /> : <TargetsTab tab={tab} onTab={setTab} />}
    </div>
  );
}

function Tabs({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <div className="mt-5 flex gap-2 border-b border-border">
      <TabButton active={tab === "leads"} onClick={() => onTab("leads")}>
        Leads
      </TabButton>
      <TabButton active={tab === "targets"} onClick={() => onTab("targets")}>
        Search targets
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        active
          ? "border-sidebar-active-bg text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TargetsTab({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <>
      <Header />
      <Tabs tab={tab} onTab={onTab} />
      <SearchTargetsTab />
    </>
  );
}

function Header({ discovery }: { discovery?: DiscoverySummary | null }) {
  const [confirming, setConfirming] = useState(false);
  const enrich = useRunEnrichment();

  async function start() {
    try {
      await enrich.mutateAsync(undefined);
      setConfirming(false);
    } catch {
      // Left open, with the error shown, rather than closing on a failure.
    }
  }

  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted">
          {discovery
            ? `Last run ${ago(discovery.at)} · ${discovery.newLeads} new ${
                discovery.newLeads === 1 ? "lead" : "leads"
              } since`
            : "Nothing has been discovered yet"}
        </p>
      </div>

      <Button variant="dark" onClick={() => setConfirming(true)} disabled={enrich.isPending}>
        <RotateCw size={18} aria-hidden />
        {enrich.isPending ? "Enriching…" : "Run enrichment"}
      </Button>

      {confirming && (
        <RunEnrichmentConfirm
          pending={enrich.isPending}
          error={enrich.error instanceof Error ? enrich.error.message : null}
          onConfirm={start}
          onClose={() => setConfirming(false)}
        />
      )}
    </header>
  );
}

function RunEnrichmentConfirm({
  pending,
  error,
  onConfirm,
  onClose,
}: {
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const preview = useEnrichmentPreview(true);
  const nothingToDo = preview.data?.candidates === 0;
  const unconfigured = preview.data?.configured === false;

  return (
    <ConfirmDialog
      title="Run enrichment?"
      confirmLabel="Run enrichment"
      pendingLabel="Enriching…"
      onConfirm={onConfirm}
      onClose={onClose}
      pending={pending}
      disabled={preview.isPending || nothingToDo || unconfigured}
      error={error}
    >
      {preview.isPending && <p className="text-muted">Working out what this would cost…</p>}

      {preview.isError && (
        <p className="text-danger">
          Could not work out what this would look up. Run it only if you are sure.
        </p>
      )}

      {unconfigured && (
        <p className="text-danger">
          Apollo has no credentials configured, so a run would do nothing.
        </p>
      )}

      {preview.data && !unconfigured && (
        <>
          <p>
            {nothingToDo ? (
              "Nothing is waiting to be enriched. Every lead with a website has been looked up recently."
            ) : (
              <>
                This will look up{" "}
                <span className="font-medium">
                  {preview.data.candidates} {preview.data.candidates === 1 ? "lead" : "leads"}
                </span>{" "}
                on Apollo. Each lookup is billed, whether or not it finds anything.
              </>
            )}
          </p>

          {preview.data.cappedAt !== undefined && (
            <p className="mt-3 text-muted">
              That is the per-run cap — more are waiting behind it, and will need another run.
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}

function LeadsTab({ tab, onTab }: { tab: Tab; onTab: (tab: Tab) => void }) {
  const [search, setSearch] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [open, setOpen] = useState<Lead | null>(null);

  const { data, isPending, isError, error } = useLeads({
    search: search.trim() || undefined,
    onlyNew,
  });

  const discovery = data?.discovery;

  return (
    <>
      <Header discovery={discovery} />
      <Tabs tab={tab} onTab={onTab} />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search size={15} aria-hidden className="shrink-0 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by lead"
            aria-label="Search by lead"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </label>

        {discovery && discovery.newLeads > 0 && (
          <button
            type="button"
            onClick={() => setOnlyNew((only) => !only)}
            aria-pressed={onlyNew}
            className={`h-9 rounded-lg px-3 text-sm font-medium ${
              onlyNew
                ? "bg-sidebar-active-bg text-sidebar-active-foreground"
                : "border border-control-edge bg-surface hover:bg-sidebar-hover-bg"
            }`}
          >
            New from the last run ({discovery.newLeads})
          </button>
        )}
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          {error instanceof Error ? error.message : "Could not load the leads"}
        </p>
      )}

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {data?.leads.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          {search ? `No lead matches "${search}".` : "No leads yet."}
        </p>
      )}

      {data && data.leads.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-muted">
                <th scope="col" className="px-5 py-3">
                  Lead
                </th>
                <th scope="col" className="px-5 py-3">
                  Area
                </th>
                <th scope="col" className="px-5 py-3">
                  Source
                </th>
                <th scope="col" className="px-5 py-3">
                  Last visit
                </th>
                <th scope="col" className="px-5 py-3">
                  Last outcome
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {data.leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} onOpen={() => setOpen(lead)} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <p className="mt-3 text-sm text-muted">
          Showing {data.leads.length} of {data.pagination.totalItems}
        </p>
      )}

      {open && <LeadDetail lead={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function LastVisitCell({ lastVisit }: { lastVisit: Lead["lastVisit"] }) {
  if (lastVisit?.visitedAt) return <>{arrivedOn(lastVisit.visitedAt)}</>;

  if (lastVisit?.scheduledFor) {
    return <span className="text-muted">Booked for {bookedFor(lastVisit.scheduledFor)}</span>;
  }

  return <>—</>;
}

function LeadRow({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  return (
    <tr className="hover:bg-sunken">
      <td className="px-5 py-4">
        <button type="button" onClick={onOpen} className="text-left font-medium hover:underline">
          {lead.companyName}
        </button>
        {lead.isNew && (
          <span className={`${BADGE} ml-2 bg-success-bg text-success-fg`}>New</span>
        )}
      </td>

      <td className="px-5 py-4 text-muted">{lead.address ?? "—"}</td>

      <td className="px-5 py-4">
        <SourceChips sources={sourcesOf(lead)} />
      </td>

      <td className="px-5 py-4 text-muted">
        <LastVisitCell lastVisit={lead.lastVisit} />
      </td>

      <td className="px-5 py-4">
        {lead.lastVisit ? (
          <>
            <StateBadge state={lead.lastVisit.state} />
            {lead.lastVisit.flagged && lead.lastVisit.state !== "FLAGGED" && (
              <p className="mt-1 text-xs text-danger">Check-in location queried</p>
            )}
          </>
        ) : (
          <span className="text-muted">Never visited</span>
        )}
      </td>

      <td className="px-5 py-4 text-right">
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View ${lead.companyName}`}
          className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-foreground"
        >
          <Eye size={16} aria-hidden />
        </button>
      </td>
    </tr>
  );
}
