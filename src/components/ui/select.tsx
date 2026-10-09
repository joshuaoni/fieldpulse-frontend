"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { anchorDrop, type DropAnchor } from "./drop-placement";

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Past this many options, scrolling to find a name stops being reasonable and
 * the panel grows a search field of its own.
 */
const SEARCH_FROM = 8;

const matches = (option: SelectOption, term: string) =>
  `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(term);

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
  searchable,
  onSearch,
  searchPlaceholder = "Search…",
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
  searchable?: boolean;
  onSearch?: (term: string) => void;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [drop, setDrop] = useState<DropAnchor>({
    side: "below",
    maxHeight: 240,
    left: 0,
    width: 0,
    top: 0,
  });
  const [term, setTerm] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const searching = searchable ?? (Boolean(onSearch) || options.length > SEARCH_FROM);
  const needle = term.trim().toLowerCase();
  const shown =
    !searching || onSearch || !needle ? options : options.filter((o) => matches(o, needle));

  const reveal = () => {
    setTerm("");
    onSearch?.("");
    setDrop(anchorDrop(trigger.current));
    setOpen(true);
  };

  const retype = (value: string) => {
    setTerm(value);
    onSearch?.(value.trim());
  };

  const chosen = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (root.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const follow = () => setDrop(anchorDrop(trigger.current));

    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (searching) {
      search.current?.focus();
      return;
    }

    const items = focusable(list.current);
    const at = items.findIndex((item) => item.dataset.value === value);
    (items[at] ?? items[0])?.focus();
  }, [open, value, searching]);

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
      if (searching) {
        search.current?.focus();
        return;
      }

      const typed = event.key.toLowerCase();
      const after = [...items.slice(at + 1), ...items.slice(0, at + 1)];
      after.find((item) => item.textContent?.trim().toLowerCase().startsWith(typed))?.focus();
    }
  }

  function onSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusable(list.current)[0]?.focus();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      shut();
    }
  }

  const box = size === "sm" ? "min-h-10 px-2 text-sm" : "min-h-11 px-3 py-2.5 text-base";

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

      {open &&
        createPortal(
          <div
            ref={panel}
            data-side={drop.side}
            style={{
              position: "fixed",
              left: drop.left,
              width: drop.width,
              top: drop.top,
              bottom: drop.bottom,
              zIndex: 60,
            }}
            className="overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
          >
            {searching && (
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search size={15} aria-hidden className="shrink-0 text-muted" />
                <input
                  ref={search}
                  type="text"
                  value={term}
                  onChange={(event) => retype(event.target.value)}
                  onKeyDown={onSearchKeys}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label ?? placeholder}`}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
                />
              </div>
            )}

            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-label={label ?? placeholder}
              onKeyDown={onListKeys}
              style={{ maxHeight: drop.maxHeight }}
              className="overflow-auto p-1"
            >
              {shown.map((option) => {
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

              {shown.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">
                  {needle ? "No matches." : "Nothing to choose from."}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

const focusable = (list: HTMLUListElement | null): HTMLButtonElement[] => [
  ...(list?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') ?? []),
];
