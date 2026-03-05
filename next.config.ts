import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export by default. Enable only for mobile builds.
  ...(process.env.BUILD_MOBILE === 'true' ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
