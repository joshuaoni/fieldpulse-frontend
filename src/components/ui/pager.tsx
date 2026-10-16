"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** One page of any list in the app. */
export const PAGE_SIZE = 20;

export function Pager({
  page,
  totalItems,
  pageSize = PAGE_SIZE,
  onPageChange,
  className = "",
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Pagination"
      className={`mt-4 flex flex-wrap items-center justify-between gap-3 text-sm ${className}`}
    >
      <p className="text-muted">
        Showing {first}–{last} of {totalItems}
      </p>

      <div className="flex items-center gap-2">
        <PagerButton
          label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} aria-hidden />
          Prev
        </PagerButton>

        <span className="px-1 text-muted">
          Page {page} of {totalPages}
        </span>

        <PagerButton
          label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight size={16} aria-hidden />
        </PagerButton>
      </div>
    </nav>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-10 items-center gap-1 rounded-full border border-border bg-surface px-3 font-medium hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface"
    >
      {children}
    </button>
  );
}

export function usePageState(resetKey = ""): [number, (page: number) => void] {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  const page = state.key === resetKey ? state.page : 1;

  return [page, (next: number) => setState({ key: resetKey, page: next })];
}

export function usePagedItems<T>(items: T[], resetKey = "") {
  const [wanted, setPage] = usePageState(resetKey);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(wanted, totalPages);

  return {
    page,
    setPage,
    totalItems: items.length,
    pageItems: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}
