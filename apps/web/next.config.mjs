/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compile workspace TS packages directly (no pre-build step in dev).
  transpilePackages: ['@eworld/shared', '@eworld/protocol', '@eworld/game-core'],
  experimental: {
    // three.js is large; let Next optimize the import surface.
    optimizePackageImports: ['@react-three/drei'],
  },
};

export default nextConfig;
