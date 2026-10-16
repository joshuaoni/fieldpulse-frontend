"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FieldPulseLoader } from "@/components/ui/fieldpulse-loader";
import { useMyFieldRole } from "@/lib/field-role";

export function LandingRedirect() {
  const router = useRouter();
  const fieldRole = useMyFieldRole();

  const destination = fieldRole.isSuccess
    ? fieldRole.data?.fieldRole === "FIELD_MANAGER"
      ? "/manager/overview"
      : "/today"
    : null;

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      {fieldRole.isError ? (
        <p className="text-sm text-muted">Could not work out where to take you.</p>
      ) : (
        <FieldPulseLoader />
      )}
    </main>
  );
}
