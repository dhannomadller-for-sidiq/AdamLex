import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable static export when deploying to Vercel so API routes work
  ...(process.env.VERCEL ? {} : { output: 'export' }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
