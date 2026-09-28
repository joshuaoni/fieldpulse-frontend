"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { useLeads } from "@/features/leads/hooks";

/**
 * Choosing a lead, wherever a screen needs one.
 */
export function LeadPicker({
  id,
  value,
  onChange,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (leadId: string) => void;
  className?: string;
}) {
  const [search, setSearch] = useState("");
  const leads = useLeads({ search: search.trim() || undefined });

  return (
    <div className={className}>
      <label className="block text-sm font-medium" htmlFor={`${id}-search`}>
        Find the lead
      </label>
      <input
        id={`${id}-search`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name"
        className="mt-1.5 w-full rounded-lg border border-border bg-surface px-4 py-3 text-base outline-none placeholder:text-sidebar-section-label focus:border-chip-active-edge"
      />

      <div className="mt-4">
        <label className="block text-sm font-medium" htmlFor={id}>
          Lead
        </label>
        <Select
          id={id}
          value={value}
          onChange={onChange}
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
    </div>
  );
}
