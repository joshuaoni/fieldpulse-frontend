import { RequireSession } from "@/components/require-session";
import { MyWeekScreen } from "@/features/visits/components/my-week-screen";

export const metadata = { title: "This week — FieldPulse" };

export default function MyWeekPage() {
  return (
    <RequireSession>
      <MyWeekScreen />
    </RequireSession>
  );
}
