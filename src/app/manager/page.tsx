import { RequireSession } from "@/components/require-session";
import { TeamVisitsScreen } from "@/features/visits/components/team-visits-screen";

export const metadata = { title: "Team visits — FieldPulse" };

export default function ManagerPage() {
  return (
    <RequireSession>
      <TeamVisitsScreen />
    </RequireSession>
  );
}
