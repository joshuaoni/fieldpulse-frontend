"use client";

import { CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { PassSummary } from "../types";

const leads = (count: number) => `${count} ${count === 1 ? "lead" : "leads"}`;

export function EnrichmentComplete({
  summary,
  onClose,
}: {
  summary: PassSummary;
  onClose: () => void;
}) {
  const rows = [
    { label: "Updated with new details", count: summary.updated },
    { label: "No new details found", count: summary.skipped },
    { label: "Failed", count: summary.failed, tone: summary.failed ? "text-danger" : "" },
  ];

  return (
    <Modal
      onClose={onClose}
      label="Enrichment complete"
      header={
        <div className="flex items-center gap-2">
          <CircleCheck size={20} aria-hidden className="text-success-fg" />
          <h2 className="text-lg font-semibold tracking-tight">Enrichment complete</h2>
        </div>
      }
    >
      <p className="text-sm">
        Looked up <span className="font-medium">{leads(summary.considered)}</span> on Apollo.
      </p>

      <dl className="mt-4 divide-y divide-border rounded-lg border border-border text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
            <dt className="text-muted">{row.label}</dt>
            <dd className={`font-medium tabular-nums ${row.tone ?? ""}`}>{row.count}</dd>
          </div>
        ))}
      </dl>

      {summary.failed > 0 && (
        <p className="mt-3 text-sm text-muted">
          A lookup that failed at Apollo is tried again on the next run.
        </p>
      )}

      {summary.cappedAt !== undefined && (
        <p className="mt-3 text-sm text-muted">
          This run stopped at its cap of {summary.cappedAt}. More leads are waiting — run enrichment
          again to reach them.
        </p>
      )}

      <div className="mt-8 flex justify-end">
        <Button variant="dark" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
