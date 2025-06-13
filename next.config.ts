/** @type {import('next').NextConfig} */
import type { Configuration } from 'webpack';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dpnarzcikszoheyoqxcn.supabase.co",
        pathname: "/storage/v1/object/public/**", // More specific path
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config: Configuration) => {
    // Ensure config.resolve exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Ensure config.resolve.alias exists
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    // Add alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };
    
    // Ignore warnings from Supabase RealtimeClient
    config.ignoreWarnings = [
      { module: /node_modules\/@supabase\/realtime-js/ },
    ];
    
    return config;
  },
};

module.exports = nextConfig;
