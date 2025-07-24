/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig
