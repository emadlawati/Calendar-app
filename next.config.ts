import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The widget renderer reads these font files at runtime; without this they
  // are not bundled into the serverless function and the route 500s in
  // production while working perfectly in dev.
  outputFileTracingIncludes: {
    "/api/widget/[token]": ["./src/lib/fonts/**"],
  },
};

export default nextConfig;
