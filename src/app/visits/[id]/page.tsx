import Link from "next/link";
import { RequireSession } from "@/components/require-session";
import { VisitDetail } from "@/features/visits/components/visit-detail";
import { PendingActionsBanner } from "@/features/visits/components/pending-actions-banner";

export const metadata = { title: "Visit — FieldPulse" };

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <RequireSession>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
        <Link href="/" className="text-sm text-brand underline">
          All visits
        </Link>
        <PendingActionsBanner />
        <VisitDetail visitId={id} />
      </main>
    </RequireSession>
  );
}
