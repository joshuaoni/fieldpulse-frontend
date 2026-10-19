import type { NextConfig } from "next";

/**
 * Hosts allowed to request dev-only assets (`/_next`, `/__nextjs`, the HMR
 * socket).
 *
 * This is development-only and does not affect a production build.
 * Set DEV_ALLOWED_ORIGINS to add a hostname the ranges below don't cover.
 */
const privateNetworkHosts = [
  "10.*.*.*",
  "192.168.*.*",
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
];

const allowedDevOrigins = [
  ...privateNetworkHosts,
  ...(process.env.DEV_ALLOWED_ORIGINS?.split(",")
    .map((host) => host.trim())
    .filter(Boolean) ?? []),
];

const chatwootOrigin =
  process.env.NEXT_PUBLIC_CHATWOOT_ORIGIN?.trim() || "https://app.chatwoot.com";

const isDev = process.env.NODE_ENV === "development";

/**
 * Response headers.
 *
 * Production is a static export served by CloudFront, and a static export
 * cannot emit headers — CloudFront response-headers policies own them there
 * (`deploy/README.md` lists the exact values; keep the two in sync). The
 * `headers()` hook below exists only so `next dev` behaves like production.
 */
const devHeaders: NonNullable<NextConfig["headers"]> = async () => [
  {
    source: "/((?!integrations/chatwoot).*)",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
  {
    source: "/integrations/chatwoot",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Content-Security-Policy",
        value: `frame-ancestors 'self' ${chatwootOrigin}`,
      },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
  {
    source: "/sw.js",
    headers: [
      { key: "Content-Type", value: "application/javascript; charset=utf-8" },
      { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
    ],
  },
];

const nextConfig: NextConfig = {
  // Static export: `next build` writes plain HTML/JS/CSS to `out/`, which the
  // deploy workflow syncs to S3 behind CloudFront (same shape as the
  // inventory dashboard). Anything needing a Node server is off the table;
  // see the "Unsupported Features" list in the Next.js static-exports guide.
  output: "export",
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // No image-optimisation server exists in a static export.
  images: { unoptimized: true },

  allowedDevOrigins,
  ...(isDev ? { headers: devHeaders } : {}),
};

export default nextConfig;
