import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@react-pdf/renderer", "@anthropic-ai/sdk"],
};

export default nextConfig;
