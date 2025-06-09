import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  allowedDevOrigins: [
      'http://localhost:9002', // For local development
      'https://6000-firebase-studio-1749474530644.cluster-htdgsbmflbdmov5xrjithceibm.cloudworkstations.dev' // Specific origin from logs
  ],
};

export default nextConfig;
