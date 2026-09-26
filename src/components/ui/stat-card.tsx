import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export function StatCard({
  label,
  value,
  icon,
  trend,
  tone,
}: {
  label: string;
  value: string;
  icon?: string | ReactNode;
  trend?: { direction: "up" | "down"; title: string } | null;
  tone?: "good";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p
          className={`flex items-center gap-2 text-2xl font-semibold ${
            tone === "good" ? "text-success-fg" : ""
          }`}
        >
          {value}

          {trend && (
            <span
              title={trend.title}
              className={trend.direction === "up" ? "text-success-fg" : "text-danger"}
            >
              {trend.direction === "up" ? (
                <TrendingUp size={20} aria-hidden />
              ) : (
                <TrendingDown size={20} aria-hidden />
              )}
            </span>
          )}
        </p>

        {typeof icon === "string" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" aria-hidden className="size-8 shrink-0" />
        ) : (
          icon
        )}
      </div>
    </div>
  );
}
