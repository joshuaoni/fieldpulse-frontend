import { RequireSession } from "@/components/require-session";
import { MyVisitsScreen } from "@/features/visits/components/my-visits-screen";

export default function HomePage() {
  return (
    <RequireSession>
      <MyVisitsScreen />
    </RequireSession>
  );
}
