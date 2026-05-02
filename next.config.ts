/** @type {import('next').NextConfig} */
const nextConfig = {
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}'
    },
    '@mui/lab': {
      transform: '@mui/lab/{{member}}'
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
        pathname: '**'
      }
    ]
  },
  env: {
    NEXT_APP_VERSION: 'v4.0.0',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? '',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000/',
    NEXT_APP_GOOGLE_MAPS_API_KEY: process.env.NEXT_APP_GOOGLE_MAPS_API_KEY ?? '',
    NEXT_APP_API_URL:
      process.env.NEXT_APP_API_URL ?? 'https://mock-data-api-nextjs.vercel.app',
    NEXT_APP_JWT_SECRET: process.env.NEXT_APP_JWT_SECRET ?? '',
    NEXT_APP_JWT_TIMEOUT: process.env.NEXT_APP_JWT_TIMEOUT ?? '86400',
    NEXTAUTH_SECRET_KEY: process.env.NEXTAUTH_SECRET_KEY ?? ''
  }
};

module.exports = nextConfig;
