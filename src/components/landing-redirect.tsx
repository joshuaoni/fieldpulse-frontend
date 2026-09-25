"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMyFieldRole } from "@/features/field-roles/hooks";

export function LandingRedirect() {
  const router = useRouter();
  const fieldRole = useMyFieldRole();

  const destination = fieldRole.isSuccess
    ? fieldRole.data?.fieldRole === "FIELD_MANAGER"
      ? "/manager/overview"
      : "/my-week"
    : null;

  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  return (
    <main className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted">
        {fieldRole.isError ? "Could not work out where to take you." : "Loading…"}
      </p>
    </main>
  );
}
