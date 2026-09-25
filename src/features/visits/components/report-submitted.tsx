"use client";

import Link from "next/link";

export function ReportSubmitted({
  companyName,
  queued,
}: {
  companyName: string;
  queued: boolean;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/seal.svg" alt="" aria-hidden className="size-32" />

      <h2 className="mt-10 text-xl font-bold tracking-tight">Report Submitted</h2>

      <p className="mt-2 max-w-xs text-[15px] text-muted">
        {companyName} visit logged for today.
        <br />
        {queued
          ? "It will reach your manager as soon as you have a connection."
          : "Your manager can see it now."}
      </p>

      <Link
        href="/today"
        className="mt-8 flex h-13 w-full max-w-sm items-center justify-center rounded-full bg-sidebar-active-bg text-base font-medium text-sidebar-active-foreground"
      >
        Back to visits
      </Link>
    </section>
  );
}
