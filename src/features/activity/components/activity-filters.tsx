"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CHIP, CHIP_OFF, CHIP_ON } from "@/components/ui/chip";
import { Modal } from "@/components/ui/modal";
import {
  ENTITY_LABEL,
  ENTITY_TYPES,
  NO_ACTIVITY_FILTERS,
  actionLabel,
  type ActivityFilters,
} from "../types";

export function ActivityFiltersDialog({
  filters,
  actions,
  onApply,
  onClose,
}: {
  filters: ActivityFilters;
  actions: string[];
  onApply: (filters: ActivityFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters);

  const toggle = (list: string[], value: string): string[] =>
    list.includes(value) ? list.filter((held) => held !== value) : [...list, value];

  return (
    <Modal
      onClose={onClose}
      label="Filters"
      header={<h2 className="text-lg font-semibold tracking-tight">Filters</h2>}
    >
      <Group label="By area">
        {ENTITY_TYPES.map((entityType) => (
          <Chip
            key={entityType}
            selected={draft.entityTypes.includes(entityType)}
            onClick={() =>
              setDraft({ ...draft, entityTypes: toggle(draft.entityTypes, entityType) })
            }
          >
            {ENTITY_LABEL[entityType]}
          </Chip>
        ))}
      </Group>

      {actions.length > 0 && (
        <Group label="By what happened">
          {actions.map((action) => (
            <Chip
              key={action}
              selected={draft.actions.includes(action)}
              onClick={() => setDraft({ ...draft, actions: toggle(draft.actions, action) })}
            >
              {actionLabel(action)}
            </Chip>
          ))}
        </Group>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => setDraft({ ...NO_ACTIVITY_FILTERS, search: draft.search })}
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
