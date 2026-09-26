import { RequireSession } from "@/components/require-session";
import { NotificationsScreen } from "@/features/notifications/components/notifications-screen";

export const metadata = { title: "Notifications — FieldPulse" };

export default function NotificationsPage() {
  return (
    <RequireSession>
      <NotificationsScreen />
    </RequireSession>
  );
}
