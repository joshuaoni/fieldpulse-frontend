"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextField } from "@/components/ui/text-field";
import { useCreateSearchTarget } from "../hooks";
import type { SearchTarget } from "../types";

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function SearchTargetForm({ from, onClose }: { from?: SearchTarget; onClose: () => void }) {
  const [query, setQuery] = useState(from?.query ?? "");
  const [area, setArea] = useState(from?.area ?? "");
  const [sector, setSector] = useState(from?.sector ?? "");
  const create = useCreateSearchTarget();

  const unchangedSearch = Boolean(from && same(query, from.query) && same(area, from.area));

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
      label={from ? "Edit a search target" : "Add a search target"}
      header={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {from ? "Edit search target" : "Add search target"}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {from
              ? "Saving creates a new target. This one stays as it is."
              : "One Maps search, saved so it can be re-run"}
          </p>
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

      {unchangedSearch && (
        <p className="mt-4 text-sm text-muted">
          Change the search or the area to save a new target — a target with this search and area
          already exists.
        </p>
      )}

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
          disabled={create.isPending || !query.trim() || !area.trim() || unchangedSearch}
        >
          {create.isPending ? "Saving…" : from ? "Save as new target" : "Save target"}
        </Button>
      </div>
    </Modal>
  );
}
