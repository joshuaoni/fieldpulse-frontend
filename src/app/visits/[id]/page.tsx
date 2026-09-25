import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RequireSession } from "@/components/require-session";
import { VisitDetail } from "@/features/visits/components/visit-detail";
import { PendingActionsBanner } from "@/features/visits/components/pending-actions-banner";

export const metadata = { title: "Visit — FieldPulse" };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RequireSession>
      <main className="mx-auto flex h-dvh w-full max-w-lg flex-col overflow-hidden px-4">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto pt-8 pb-28">
          <Link
            href="/today"
            aria-label="Back to today"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface"
          >
            <ChevronLeft size={18} aria-hidden />
          </Link>
          <PendingActionsBanner />
          <VisitDetail visitId={id} />
        </div>
      </main>
    </RequireSession>
  );
}
