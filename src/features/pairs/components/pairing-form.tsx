"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useAssignableReps, useSavePairing } from "../hooks";
import {
  PAIR_SIZE,
  fullName,
  openMembers,
  type AssignableRep,
  type SalesPair,
} from "../types";

/**
 * Assigning the reps in a pairing.
 */
export function PairingForm({ pair, onClose }: { pair?: SalesPair; onClose: () => void }) {
  const editing = Boolean(pair);
  const current = pair ? openMembers(pair).map((member) => member.userId) : [];

  const [seats, setSeats] = useState<string[]>(current.length ? current : [""]);
  const [error, setError] = useState<string | null>(null);

  const reps = useAssignableReps();
  const save = useSavePairing();

  const options = useMemo(() => {
    const seated: AssignableRep[] = (pair ? openMembers(pair) : []).map((member) => ({
      ...member.user,
      fieldRole: "FIELD_REP",
      pairId: pair?.id ?? null,
    }));

    const byId = new Map(seated.map((rep) => [rep.id, rep]));
    for (const rep of reps.data ?? []) byId.set(rep.id, rep);

    return [...byId.values()].sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [pair, reps.data]);

  const chosen = seats.filter(Boolean);
  const duplicated = new Set(chosen).size !== chosen.length;

  const setSeat = (index: number, userId: string) =>
    setSeats((all) => all.map((seat, at) => (at === index ? userId : seat)));

  async function onSubmit() {
    setError(null);

    if (duplicated) return setError("A rep cannot fill both seats.");
    if (!chosen.length) return setError("Choose at least one rep.");

    try {
      await save.mutateAsync({ pair, userIds: chosen });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the pairing");
    }
  }

  return (
    <Modal
      onClose={onClose}
      label={editing ? "Edit pairing" : "Add a new pair"}
      header={
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {editing ? "Edit Pairing" : "New Pairing"}
          </h2>
          <p className="mt-0.5 text-sm text-muted">Assign a new pair of sales rep</p>
        </div>
      }
    >
      {seats.map((seat, index) => (
        <div key={index} className={index ? "mt-5" : ""}>
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium" htmlFor={`member-${index}`}>
              Member {index + 1}
            </label>
            {seats.length > 1 && (
              <button
                type="button"
                onClick={() => setSeats((all) => all.filter((_, at) => at !== index))}
                className="flex items-center gap-1 text-xs text-muted hover:text-danger"
              >
                <Trash2 size={14} aria-hidden />
                Remove
              </button>
            )}
          </div>

          <select
            id={`member-${index}`}
            value={seat}
            onChange={(event) => setSeat(index, event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-brand"
          >
            <option value="">{reps.isPending ? "Loading reps…" : "Select a rep"}</option>
            {options.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {fullName(rep)}
                {rep.pairId && rep.pairId !== pair?.id ? " — already paired" : ""}
              </option>
            ))}
          </select>
        </div>
      ))}

      {seats.length < PAIR_SIZE && (
        <button
          type="button"
          onClick={() => setSeats((all) => [...all, ""])}
          className="mt-4 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          <Plus size={16} aria-hidden />
          Add member
        </button>
      )}

      {reps.isError && (
        <p role="alert" className="mt-4 text-sm text-danger">
          Could not load the reps to choose from.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={save.isPending}>
          Cancel
        </Button>
        <Button variant="dark" onClick={onSubmit} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save Pairing"}
        </Button>
      </div>
    </Modal>
  );
}
