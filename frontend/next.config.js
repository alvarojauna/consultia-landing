/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No output mode - deploy as SSR to Amplify
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
