"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { OUTCOMES, OUTCOME_LABEL, type VisitOutcome } from "@/lib/outcomes";
import {
  DATE_RANGE_LABEL,
  NO_FILTERS,
  type DateRange,
  type ReportFilters,
} from "../types";

const RANGES: DateRange[] = ["TODAY", "WEEK", "MONTH"];

export const CHIP = "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm";
export const CHIP_OFF = "border-chip-edge bg-chip-bg text-muted";
export const CHIP_ON = "border-chip-active-edge bg-chip-active-bg text-foreground";

export function ReportFiltersDialog({
  filters,
  sectors,
  onApply,
  onClose,
}: {
  filters: ReportFilters;
  sectors: string[];
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((held) => held !== value) : [...list, value];

  return (
    <Modal
      onClose={onClose}
      label="Filters"
      header={<h2 className="text-lg font-semibold tracking-tight">Filters</h2>}
    >
      <Group label="By outcome">
        {OUTCOMES.map((outcome) => (
          <Chip
            key={outcome}
            selected={draft.outcomes.includes(outcome)}
            onClick={() =>
              setDraft({ ...draft, outcomes: toggle<VisitOutcome>(draft.outcomes, outcome) })
            }
          >
            {OUTCOME_LABEL[outcome]}
          </Chip>
        ))}
      </Group>

      {sectors.length > 0 && (
        <Group label="By sector">
          {sectors.map((sector) => (
            <Chip
              key={sector}
              selected={draft.sectors.includes(sector)}
              onClick={() => setDraft({ ...draft, sectors: toggle(draft.sectors, sector) })}
            >
              {sector}
            </Chip>
          ))}
        </Group>
      )}

      <Group label="By date">
        {RANGES.map((range) => (
          <Chip
            key={range}
            selected={draft.range === range}
            onClick={() => setDraft({ ...draft, range })}
          >
            {DATE_RANGE_LABEL[range]}
          </Chip>
        ))}
      </Group>

      <div className="mt-8 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setDraft({ ...NO_FILTERS, search: draft.search })}
        >
          Clear filters
        </Button>
        <Button variant="dark" onClick={() => onApply(draft)}>
          Apply filters
        </Button>
      </div>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-5 first:mt-0">
      <legend className="text-sm font-medium text-muted">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${CHIP} ${selected ? CHIP_ON : CHIP_OFF} hover:text-foreground`}
    >
      {children}
    </button>
  );
}
