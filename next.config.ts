import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent dev server instability when running `next build` while `next dev` is running.
  // Use `NEXT_DIST_DIR=.next-build npm run build` for isolated production builds.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
