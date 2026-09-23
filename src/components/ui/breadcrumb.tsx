"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
  onClick?: () => void;
}

export function Breadcrumb({
  segments,
  onBack,
}: {
  segments: BreadcrumbSegment[];
  onBack?: () => void;
}) {
  const router = useRouter();

  if (!segments.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Back"
        onClick={() => (onBack ? onBack() : router.back())}
        className="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-foreground"
      >
        <ChevronLeft aria-hidden className="size-[18px]" />
      </button>

      <ol className="flex flex-wrap items-center gap-1.5">
        {segments.map((segment, index) => {
          const last = index === segments.length - 1;

          return (
            <li key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 && (
                <span aria-hidden className="select-none text-[15px] text-muted">
                  /
                </span>
              )}

              {last || (!segment.href && !segment.onClick) ? (
                <span
                  aria-current={last ? "page" : undefined}
                  className="text-[15px] font-medium text-foreground"
                >
                  {segment.label}
                </span>
              ) : segment.onClick ? (
                <button
                  type="button"
                  onClick={segment.onClick}
                  className="text-[15px] font-medium text-muted hover:underline"
                >
                  {segment.label}
                </button>
              ) : (
                <Link
                  href={segment.href as string}
                  className="text-[15px] font-medium text-muted hover:underline"
                >
                  {segment.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
