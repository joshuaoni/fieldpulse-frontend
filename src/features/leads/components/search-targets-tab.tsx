"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useCollectDiscovery,
  useRunSearchTarget,
  useSearchTargets,
  useSetSearchTargetActive,
} from "../hooks";
import type { SearchTarget } from "../types";
import { BADGE } from "./lead-badges";
import { SearchTargetForm } from "./search-target-form";
import { FieldPulseLoader } from "@/components/ui/fieldpulse-loader";
import { Pager, usePagedItems } from "@/components/ui/pager";

const ago = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

export function SearchTargetsTab() {
  const [adding, setAdding] = useState(false);
  const { data, isPending, isError } = useSearchTargets();

  const targets = data?.searchTargets;
  const scrapingRunId = targets?.find((target) => target.apifyRunId)?.apifyRunId ?? null;
  const collecting = useCollecting(scrapingRunId);
  const paged = usePagedItems(targets ?? []);

  return (
    <>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-lg text-sm text-muted">
          Run targets through Apify to source out new leads.
        </p>
        <Button variant="dark" onClick={() => setAdding(true)}>
          <Plus size={18} aria-hidden />
          Add target
        </Button>
      </div>

      {isError && (
        <p role="alert" className="mt-6 text-sm text-danger">
          Could not load the search targets.
        </p>
      )}

      {collecting.stalled && (
        <p role="alert" className="mt-6 text-sm text-danger">
          A scrape is running, but its results could not be collected: {collecting.stalled}. It will
          be picked up by the next scheduled pass, or abandoned if it never reports back.
        </p>
      )}

      {isPending && <FieldPulseLoader className="mt-6" />}

      {targets?.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border-strong p-6 text-sm text-muted">
          No search targets yet.
        </p>
      )}

      {targets && targets.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-3xl border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium text-muted">
                <th scope="col" className="px-5 py-3">
                  Search
                </th>
                <th scope="col" className="px-5 py-3">
                  Area
                </th>
                <th scope="col" className="px-5 py-3">
                  Last run
                </th>
                <th scope="col" className="px-5 py-3">
                  Yield
                </th>
                <th scope="col" className="px-5 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border">
              {paged.pageItems.map((target) => (
                <TargetRow
                  key={target.id}
                  target={target}
                  maxResults={data?.maxResultsPerTarget ?? 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={paged.page} totalItems={paged.totalItems} onPageChange={paged.setPage} />

      {adding && <SearchTargetForm onClose={() => setAdding(false)} />}
    </>
  );
}

function useCollecting(runId: string | null) {
  const { mutateAsync: collectNow } = useCollectDiscovery();
  const [failure, setFailure] = useState<{ runId: string; message: string } | null>(null);
  const busy = useRef(false);

  const stalled = failure?.runId === runId ? (failure?.message ?? null) : null;

  useEffect(() => {
    if (!runId || stalled) return;

    const timer = setInterval(async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        await collectNow(undefined);
      } catch (error) {
        // One failure stops the polling.
        setFailure({
          runId,
          message: error instanceof Error ? error.message : "the step failed",
        });
      } finally {
        busy.current = false;
      }
    }, 8_000);

    return () => clearInterval(timer);
  }, [runId, stalled, collectNow]);

  return { stalled };
}

function TargetRow({ target, maxResults }: { target: SearchTarget; maxResults: number }) {
  const [confirming, setConfirming] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [editing, setEditing] = useState(false);
  const run = useRunSearchTarget();
  const setActive = useSetSearchTargetActive();

  const running = Boolean(target.apifyRunId);

  async function start() {
    try {
      await run.mutateAsync(target.id);
      setConfirming(false);
    } catch {
      // Left open, with the error shown, rather than closing on a failure.
    }
  }

  return (
    <tr className={target.isActive ? "" : "opacity-60"}>
      <td className="px-5 py-4">
        <span className="font-medium">{target.query}</span>
        {target.sector && <span className="ml-2 text-muted">· {target.sector}</span>}
        {!target.isActive && <span className="ml-2 text-xs text-muted">(retired)</span>}
      </td>

      <td className="px-5 py-4 text-muted">{target.area}</td>

      <td className="px-5 py-4 text-muted">
        {running ? (
          <span className={`${BADGE} bg-info/10 text-info-fg`}>
            Running{target.apifyRunStartedAt ? ` · ${ago(target.apifyRunStartedAt)}` : "…"}
          </span>
        ) : target.lastRunAt ? (
          ago(target.lastRunAt)
        ) : (
          "Never"
        )}
      </td>

      <td className="px-5 py-4">
        {target.lastRunError ? (
          <span className="text-sm text-danger">{target.lastRunError}</span>
        ) : target.lastRunNewLeads === null ? (
          <span className="text-muted">—</span>
        ) : (
          <>
            <span>
              {target.lastRunNewLeads} new {target.lastRunNewLeads === 1 ? "lead" : "leads"}
            </span>
            {target.lastRunCapped && (
              <p className="mt-1 text-xs text-muted">
                Hit its result cap — the area holds more. Narrow it, or raise the cap.
              </p>
            )}
          </>
        )}
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirming(true)}
            disabled={running || run.isPending || !target.isActive}
            className="text-sm"
          >
            <Play size={15} aria-hidden />
            {run.isPending ? "Starting…" : "Run now"}
          </Button>

          {confirming && (
            <RunTargetConfirm
              target={target}
              maxResults={maxResults}
              pending={run.isPending}
              error={run.error instanceof Error ? run.error.message : null}
              onConfirm={start}
              onClose={() => setConfirming(false)}
            />
          )}

          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${target.query} in ${target.area}`}
            className="rounded-md p-1.5 text-muted hover:bg-sunken hover:text-foreground"
          >
            <Pencil size={15} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => {
              setActive.reset();
              setToggling(true);
            }}
            disabled={setActive.isPending}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-foreground"
          >
            {target.isActive ? "Retire" : "Restore"}
          </button>

          {toggling && (
            <ConfirmDialog
              title={target.isActive ? "Retire this search?" : "Restore this search?"}
              confirmLabel={target.isActive ? "Retire" : "Restore"}
              pendingLabel={target.isActive ? "Retiring…" : "Restoring…"}
              pending={setActive.isPending}
              error={setActive.error instanceof Error ? setActive.error.message : null}
              onClose={() => setToggling(false)}
              onConfirm={() =>
                setActive.mutate(
                  { id: target.id, isActive: !target.isActive },
                  { onSuccess: () => setToggling(false) },
                )
              }
            >
              <p>
                <span className="font-medium">{target.query}</span> in{" "}
                <span className="font-medium">{target.area}</span>{" "}
                {target.isActive
                  ? "stops being run until it is restored."
                  : "goes back into the scheduled runs, and can be run by hand again."}
              </p>
            </ConfirmDialog>
          )}

          {editing && <SearchTargetForm from={target} onClose={() => setEditing(false)} />}
        </div>
      </td>
    </tr>
  );
}

function RunTargetConfirm({
  target,
  maxResults,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  target: SearchTarget;
  maxResults: number;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmDialog
      title="Run this search?"
      confirmLabel="Run search"
      pendingLabel="Starting…"
      onConfirm={onConfirm}
      onClose={onClose}
      pending={pending}
      error={error}
    >
      <p>
        This starts a Google Maps scrape for <span className="font-medium">{target.query}</span> in{" "}
        <span className="font-medium">{target.area}</span>
        {maxResults > 0 && <> — up to {maxResults} results</>}.
      </p>

      {target.lastRunCapped && (
        <p className="mt-3 text-warning-fg">
          The last run stopped at its cap, so this one would buy much the same list again. Narrowing
          the area, or raising the cap, gets you something new.
        </p>
      )}

      {target.lastRunNewLeads === 0 && !target.lastRunCapped && (
        <p className="mt-3 text-warning-fg">
          The last run found no new leads. This search has likely given everything Maps lists for
          it.
        </p>
      )}

      {target.lastRunAt && <p className="mt-3 text-muted">Last run {ago(target.lastRunAt)}.</p>}
    </ConfirmDialog>
  );
}
