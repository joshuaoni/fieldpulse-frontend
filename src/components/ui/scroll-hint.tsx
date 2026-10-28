"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function ScrollHint({
  label,
  className = "max-h-112",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [more, setMore] = useState(false);

  const measure = useCallback(() => {
    const box = ref.current;
    if (!box) return;
    setMore(box.scrollTop + box.clientHeight < box.scrollHeight - 4);
  }, []);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    for (const child of Array.from(box.children)) observer.observe(child);
    return () => observer.disconnect();
  }, [measure, children]);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={`overflow-y-auto overscroll-contain ${className}`}
      >
        {children}
      </div>

      {more && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-16 items-end justify-center bg-linear-to-t from-surface to-transparent pb-2">
          <button
            type="button"
            onClick={() =>
              ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: "smooth" })
            }
            className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm hover:text-foreground"
          >
            Scroll for more
            <ChevronDown size={14} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
