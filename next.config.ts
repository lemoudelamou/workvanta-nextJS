
import type { NextConfig } from "next";

/**
 * Sent with every response. The Content-Security-Policy only restricts what
 * can't break the app (no framing, no plugins, no <base> hijacking); a full
 * script policy would need per-request nonces.
 */
const securityHeaders = [
    // HTTPS only, for two years, including subdomains.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    // Nobody can show the app inside a frame (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
    // Browsers must not guess file types (uploads served as their real type).
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Links to other sites carry only the origin, never paths with tokens.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // The app uses none of these.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  reactCompiler: true,

  // The sidebar's account menu and collapse button live bottom-left; keep
  // the dev-only Next.js badge out of their way.
  devIndicators: { position: "bottom-right" },

  experimental: {
    serverActions: {
      // Task attachments are uploaded through a server action and may be up
      // to 10 MB (see MAX_FILE_SIZE in task-actions.ts). The default is 1 MB.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
