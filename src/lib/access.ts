/**
 * Pre-release access list.
 */
const ALLOWED_EMAILS = new Set([
  "joshuado@createyourmeta-iv.com",
  "joshuado+1@createyourmeta-iv.com",
  "seed.superadmin@meta4.test",
  "seed.staff2@meta4.test",
]);

export function isAllowedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
