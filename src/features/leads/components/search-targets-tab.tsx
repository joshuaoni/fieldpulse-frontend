"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/modal";
import { TextField } from "@/components/ui/text-field";
import {
  useCollectDiscovery,
  useCreateSearchTarget,
  useRunSearchTarget,
  useSearchTargets,
  useSetSearchTargetActive,
} from "../hooks";
import type { SearchTarget } from "../types";
import { BADGE } from "./lead-badges";

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
          A scrape is running, but its results could not be collected: {collecting.stalled}. It
          will be picked up by the next scheduled pass, or abandoned if it never reports back.
        </p>
      )}

      {isPending && <p className="mt-6 text-sm text-muted">Loading…</p>}

      {targets?.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted">
          No search targets yet. Add one to start discovering leads from Maps.
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
              {targets.map((target) => (
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

      {adding && <AddTargetForm onClose={() => setAdding(false)} />}
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
          <span className={`${BADGE} bg-blue-500/10 text-blue-700`}>
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
            onClick={() => setActive.mutate({ id: target.id, isActive: !target.isActive })}
            disabled={setActive.isPending}
            className="rounded-md px-2 py-1 text-sm text-muted hover:bg-sunken hover:text-foreground"
          >
            {target.isActive ? "Retire" : "Restore"}
          </button>
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
        This starts a Google Maps scrape for{" "}
        <span className="font-medium">{target.query}</span> in{" "}
        <span className="font-medium">{target.area}</span>
        {maxResults > 0 && <> — up to {maxResults} results</>}.
      </p>

      {target.lastRunCapped && (
        <p className="mt-3 text-amber-700">
          The last run stopped at its cap, so this one would buy much the same list again.
          Narrowing the area, or raising the cap, gets you something new.
        </p>
      )}

      {target.lastRunNewLeads === 0 && !target.lastRunCapped && (
        <p className="mt-3 text-amber-700">
          The last run found no new leads. This search has likely given everything Maps lists
          for it.
        </p>
      )}

      {target.lastRunAt && (
        <p className="mt-3 text-muted">Last run {ago(target.lastRunAt)}.</p>
      )}
    </ConfirmDialog>
  );
}

function AddTargetForm({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [sector, setSector] = useState("");
  const create = useCreateSearchTarget();

  async function onSubmit() {
    try {
      await create.mutateAsync({ query, area, sector: sector || undefined });
      onClose();
    } catch {
      // Rendered from the mutation below rather than swallowed.
    }
  }

  return (
    <Modal
      onClose={onClose}
      label="Add a search target"
      header={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Add search target</h2>
          <p className="mt-0.5 text-sm text-muted">One Maps search, saved so it can be re-run</p>
        </div>
      }
    >
      <TextField
        id="target-query"
        label="Search"
        placeholder="hardware stores"
        maxLength={200}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <TextField
        id="target-area"
        label="Area"
        placeholder="Ikoyi, Lagos"
        maxLength={200}
        value={area}
        onChange={(event) => setArea(event.target.value)}
        className="mt-4"
      />

      <TextField
        id="target-sector"
        label="Sector (optional)"
        placeholder="Construction"
        maxLength={120}
        value={sector}
        onChange={(event) => setSector(event.target.value)}
        className="mt-4"
      />

      {create.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {create.error instanceof Error ? create.error.message : "Could not save the target"}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={create.isPending}>
          Cancel
        </Button>
        <Button
          variant="dark"
          onClick={onSubmit}
          disabled={create.isPending || !query.trim() || !area.trim()}
        >
          {create.isPending ? "Saving…" : "Save target"}
        </Button>
      </div>
    </Modal>
  );
}
