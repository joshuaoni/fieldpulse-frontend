"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LeadPicker } from "@/components/lead-picker";
import { useLogUnplannedVisit } from "../hooks";

export function LogUnplannedVisit({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [leadId, setLeadId] = useState("");
  const log = useLogUnplannedVisit();

  async function submit() {
    try {
      const visit = await log.mutateAsync(leadId);
      onClose();
      router.push(`/visits/${visit.id}`);
    } catch {
      // Shown from the mutation below rather than swallowed.
    }
  }

  return (
    <Modal
      onClose={onClose}
      label="Log a visit that is not planned"
      header={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Log an unplanned visit</h2>
          <p className="mt-0.5 text-sm text-muted">
            Adds a stop to today so you can check in here
          </p>
        </div>
      }
    >
      <LeadPicker id="unplanned-lead" value={leadId} onChange={setLeadId} />

      {log.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {log.error instanceof Error ? log.error.message : "Could not log the visit"}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={log.isPending}>
          Cancel
        </Button>
        <Button variant="dark" onClick={submit} disabled={!leadId || log.isPending}>
          {log.isPending ? "Adding…" : "Add to today"}
        </Button>
      </div>
    </Modal>
  );
}
