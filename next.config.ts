import type { NextConfig } from 'next/types'

const nextConfig: NextConfig = {
  cacheComponents: true,
  typescript: {
    ignoreBuildErrors: true,
  }
} as const

export default nextConfig
