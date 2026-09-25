import { RequireFieldManager } from "@/components/require-field-manager";
import { ManagerShell } from "@/components/shell/manager-shell";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireFieldManager>
      <ManagerShell>{children}</ManagerShell>
    </RequireFieldManager>
  );
}
