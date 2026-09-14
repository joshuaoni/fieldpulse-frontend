/**
 * Pre-release access list.
 */
const ALLOWED_EMAILS = new Set([
  "joshuado@createyourmeta-iv.com",
  "joshuado+1@createyourmeta-iv.com",
]);

export function isAllowedUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.has(email.trim().toLowerCase());
}
