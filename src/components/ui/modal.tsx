"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  onClose: () => void;
  label: string;
  header: ReactNode;
  children: ReactNode;
}

export function Modal({ onClose, label, header, children }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = scroll;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-120 flex-col overflow-hidden rounded-2xl bg-surface text-foreground shadow-xl outline-none"
      >
        <div className="flex items-start gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 shrink-0 rounded-lg p-2 text-muted hover:bg-sunken hover:text-foreground"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
