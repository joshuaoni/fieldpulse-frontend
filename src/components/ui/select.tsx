"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { placeDrop, type DropPlacement } from "./drop-placement";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function Select({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  size = "md",
  label,
  className = "",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<DropPlacement>({ side: "below", maxHeight: 240 });
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const reveal = () => {
    setPlacement(placeDrop(trigger.current));
    setOpen(true);
  };

  const chosen = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const items = focusable(list.current);
    const at = items.findIndex((item) => item.dataset.value === value);
    (items[at] ?? items[0])?.focus();
  }, [open, value]);

  const shut = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (option: SelectOption) => {
    onChange(option.value);
    shut();
  };

  function onListKeys(event: KeyboardEvent<HTMLUListElement>) {
    const items = focusable(list.current);
    if (!items.length) return;

    const at = items.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      items[(at + step + items.length) % items.length]?.focus();
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      (event.key === "Home" ? items[0] : items[items.length - 1])?.focus();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      shut();
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const needle = event.key.toLowerCase();
      const after = [...items.slice(at + 1), ...items.slice(0, at + 1)];
      after.find((item) => item.textContent?.trim().toLowerCase().startsWith(needle))?.focus();
    }
  }

  const box =
    size === "sm"
      ? "min-h-10 px-2 text-sm"
      : "min-h-11 px-3 py-2.5 text-base";

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        id={id}
        ref={trigger}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : reveal())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            reveal();
          }
        }}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background text-left outline-none focus:border-chip-active-edge disabled:opacity-60 ${box}`}
      >
        <span className={`min-w-0 truncate ${chosen ? "" : "text-muted"}`}>
          {chosen?.label ?? placeholder}
        </span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-muted" />
      </button>

      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-label={label ?? placeholder}
          data-side={placement.side}
          onKeyDown={onListKeys}
          style={{ maxHeight: placement.maxHeight }}
          className={`absolute z-30 w-full overflow-auto rounded-lg border border-border bg-surface p-1 shadow-lg ${
            placement.side === "above" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-value={option.value}
                  disabled={option.disabled}
                  onClick={() => choose(option)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-sunken focus:bg-sunken disabled:opacity-50 ${
                    selected ? "font-medium" : ""
                  }`}
                >
                  <span className="min-w-0 truncate">
                    {option.label}
                    {option.hint && <span className="text-muted"> {option.hint}</span>}
                  </span>
                  {selected && <Check size={15} aria-hidden className="shrink-0" />}
                </button>
              </li>
            );
          })}

          {options.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nothing to choose from.</li>}
        </ul>
      )}
    </div>
  );
}

const focusable = (list: HTMLUListElement | null): HTMLButtonElement[] => [
  ...(list?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []),
];
