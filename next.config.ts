import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  // Next.js 16+ native/server deps config
  serverExternalPackages: ["canvas"],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ensure webpack doesn't try to bundle 'canvas' on the server
      config.externals = [...(config.externals || []), "canvas"];
    }
    return config;
  },
};

export default nextConfig;
