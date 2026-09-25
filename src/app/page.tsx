import { RequireSession } from "@/components/require-session";
import { LandingRedirect } from "@/components/landing-redirect";

export default function HomePage() {
  return (
    <RequireSession>
      <LandingRedirect />
    </RequireSession>
  );
}
