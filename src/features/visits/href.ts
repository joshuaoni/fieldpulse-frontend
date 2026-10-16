/**
 * The visit detail screen lives at `/visits?id=…` rather than `/visits/[id]`.
 *
 * The app ships as a static export (S3 + CloudFront, see `deploy/`), and a
 * static export can only emit dynamic segments it knows at build time. Visit
 * IDs are runtime data, so the ID rides in the query string instead. Every
 * link to a visit goes through here so the shape lives in one place.
 */
export function visitHref(visitId: string): string {
  return `/visits?id=${encodeURIComponent(visitId)}`;
}
