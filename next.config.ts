import type { NextConfig } from "next";
import { webpack } from "next/dist/compiled/webpack/webpack";

module.exports = {
  webpack(config: webpack.Configuration, { isServer }: { isServer: boolean }) {
    if (!isServer) {
      config.module.rules.push({
        test: /\.node$/,
        use: 'file-loader',
      });
    }
    return config;
  },

  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
