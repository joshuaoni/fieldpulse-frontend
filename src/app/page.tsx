"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useSession } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const { status, user, signOut } = useSession();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <header className="flex items-center gap-3">
        <BrandMark className="h-10 w-10" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold tracking-tight">FieldPulse</h1>
          <p className="text-sm text-muted">
            {user.firstName} {user.lastName}
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg border border-border px-3 py-1.5 text-sm"
        >
          Sign out
        </button>
      </header>

      <section className="mt-8 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium">Session</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="break-all">{user.email}</dd>
          <dt className="text-muted">ERP role</dt>
          <dd>{user.role}</dd>
          <dt className="text-muted">Job title</dt>
          <dd>{user.jobTitle ?? "—"}</dd>
          <dt className="text-muted">Module roles</dt>
          <dd>
            {user.moduleRoles?.length
              ? user.moduleRoles.map((entry) => `${entry.module}: ${entry.role}`).join(", ")
              : "none"}
          </dd>
        </dl>
      </section>
    </main>
  );
}
