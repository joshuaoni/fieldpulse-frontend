"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAddStop, useCandidateLeads } from "../hooks";
import { DAY_NAMES } from "../types";

/**
 * Putting a lead on a route by hand.
 */
export function AddStop({
  planId,
  pairName,
  weekStart,
  defaultDayIndex = 0,
  onClose,
}: {
  planId: string;
  pairName: string;
  weekStart?: string;
  defaultDayIndex?: number;
  onClose: () => void;
}) {
  const [leadId, setLeadId] = useState("");
  const [dayIndex, setDayIndex] = useState(String(defaultDayIndex));

  const leads = useCandidateLeads(true);
  const add = useAddStop(weekStart);

  async function submit() {
    try {
      await add.mutateAsync({ planId, leadId, dayIndex: Number(dayIndex) });
      onClose();
    } catch {
      // Rendered from the mutation below rather than swallowed.
    }
  }

  return (
    <Modal
      onClose={onClose}
      label="Add a stop to this route"
      header={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Add a stop</h2>
          <p className="mt-0.5 text-sm text-muted">{pairName}</p>
        </div>
      }
    >
      <label className="block text-sm font-medium" htmlFor="add-stop-lead">
        Lead
      </label>
      <Select
        id="add-stop-lead"
        value={leadId}
        onChange={setLeadId}
        placeholder={leads.isPending ? "Loading leads…" : "Choose a lead"}
        options={(leads.data ?? []).map((lead) => ({
          value: lead.id,
          label: lead.companyName,
          hint: lead.address ?? lead.sector ?? undefined,
        }))}
        className="mt-1.5"
      />

      {leads.data?.length === 0 && (
        <p className="mt-2 text-sm text-muted">
          No lead is free to plan: every one is already on a route, being visited, or inside its
          cool-off.
        </p>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor="add-stop-day">
          Day
        </label>
        <Select
          id="add-stop-day"
          value={dayIndex}
          onChange={setDayIndex}
          placeholder="Choose a day"
          options={DAY_NAMES.map((name, index) => ({ value: String(index), label: name }))}
          className="mt-1.5"
        />
        <p className="mt-1.5 text-xs text-muted">
          It goes on the end of that day. The day&apos;s drive times are cleared, so the route is
          measured again.
        </p>
      </div>

      {leads.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load the leads to choose from.
        </p>
      )}

      {add.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {add.error instanceof Error ? add.error.message : "Could not add the stop"}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={add.isPending}>
          Cancel
        </Button>
        <Button variant="dark" onClick={submit} disabled={!leadId || add.isPending}>
          {add.isPending ? "Adding…" : "Add stop"}
        </Button>
      </div>
    </Modal>
  );
}
