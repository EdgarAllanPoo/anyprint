import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-ignore — Next.js supports this at runtime
    allowedDevOrigins: [
      "https://anyprint-frontend.ngrok.app",
    ],
  },
};

export default nextConfig;
