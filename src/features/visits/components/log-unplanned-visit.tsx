"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useLeads } from "@/features/leads/hooks";
import { useLogUnplannedVisit } from "../hooks";

export function LogUnplannedVisit({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [leadId, setLeadId] = useState("");
  const [search, setSearch] = useState("");
  const leads = useLeads({ search: search.trim() || undefined });
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
      <label className="block text-sm font-medium" htmlFor="unplanned-search">
        Find the lead
      </label>
      <input
        id="unplanned-search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name"
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none placeholder:text-sidebar-section-label focus:border-chip-active-edge"
      />

      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="unplanned-lead">
          Lead
        </label>
        <Select
          id="unplanned-lead"
          value={leadId}
          onChange={setLeadId}
          placeholder={leads.isPending ? "Loading leads…" : "Choose a lead"}
          options={(leads.data?.leads ?? []).map((lead) => ({
            value: lead.id,
            label: lead.companyName,
            hint: lead.address ?? undefined,
          }))}
          className="mt-1.5"
        />
      </div>

      {leads.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load the leads to choose from.
        </p>
      )}

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
