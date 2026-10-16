import { Suspense } from "react";
import { RequireSession } from "@/components/require-session";
import { VisitScreen } from "@/features/visits/components/visit-screen";

export const metadata = { title: "Visit — FieldPulse" };

export default function VisitPage() {
  return (
    <RequireSession>
      {/* useSearchParams needs a Suspense boundary to prerender the shell. */}
      <Suspense fallback={<p className="p-4 text-sm text-muted">Loading…</p>}>
        <VisitScreen />
      </Suspense>
    </RequireSession>
  );
}
