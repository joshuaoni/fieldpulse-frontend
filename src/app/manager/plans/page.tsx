import { RequireSession } from "@/components/require-session";
import { PlanWeekGrid } from "@/features/plans/components/plan-week-grid";

export const metadata = { title: "Weekly plan — FieldPulse" };

export default function PlansPage() {
  return (
    <RequireSession>
      <PlanWeekGrid />
    </RequireSession>
  );
}
