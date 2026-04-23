/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: new URL('..', import.meta.url).pathname,
  allowedDevOrigins: ['http://localhost:3000', 'http://127.0.0.1:3000']
};

export default nextConfig;
