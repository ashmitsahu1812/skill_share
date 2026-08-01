import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'res.cloudinary.com' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'avatars.githubusercontent.com' },
    ],
  },
  experimental: {
    // Allow server actions and app router
  },
};

export default nextConfig;
