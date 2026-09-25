import { RequireSession } from "@/components/require-session";
import { RepHomeScreen } from "@/features/visits/components/rep-home-screen";

export const metadata = { title: "Today — FieldPulse" };

export default function TodayPage() {
  return (
    <RequireSession>
      <RepHomeScreen />
    </RequireSession>
  );
}
