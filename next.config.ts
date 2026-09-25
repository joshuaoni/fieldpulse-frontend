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

const chatwootOrigin = process.env.NEXT_PUBLIC_CHATWOOT_ORIGIN ?? "https://app.chatwoot.com";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",

  allowedDevOrigins,
  async headers() {
    return [
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
  },
};

export default nextConfig;
