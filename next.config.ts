
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
