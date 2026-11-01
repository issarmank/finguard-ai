/** @type {import('next').NextConfig} */
const nextConfig = {
  // In production the browser calls /api/* on the frontend domain and Vercel proxies it to
  // the FastAPI project, so the auth cookie stays first-party and CORS isn't involved.
  async rewrites() {
    if (!process.env.BACKEND_URL) return [];
    return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL}/:path*` }];
  },
};

export default nextConfig;
