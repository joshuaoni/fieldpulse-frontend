"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface ConfirmDialogProps {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
  disabled?: boolean;
  error?: string | null;
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  pendingLabel,
  onConfirm,
  onClose,
  pending = false,
  disabled = false,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      onClose={onClose}
      label={title}
      header={<h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
    >
      <div className="text-sm">{children}</div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-8 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="dark" onClick={onConfirm} disabled={pending || disabled}>
          {pending ? (pendingLabel ?? "Working…") : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
