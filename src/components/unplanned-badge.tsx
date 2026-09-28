/**
 * Marks a visit the week did not send anyone on.
 */
export function UnplannedBadge({ planId }: { planId: string | null }) {
  if (planId) return null;

  return (
    <span className="inline-flex shrink-0 items-center rounded-md bg-sunken px-2 py-1 text-xs/none font-medium text-muted">
      Unplanned
    </span>
  );
}
