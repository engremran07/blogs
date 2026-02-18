import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "frame-src https://challenges.cloudflare.com https://www.google.com https://newassets.hcaptcha.com",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // standalone output is for Docker/CI (Linux); skip on Windows where
  // Turbopack chunk filenames with ":" break NTFS copyfile.
  output: process.platform !== "win32" ? "standalone" : undefined,
  poweredByHeader: false,
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  serverExternalPackages: ["bcrypt", "sharp"],
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    // Load redirects from the database at build time.
    // For dynamic redirects at runtime, use the /api/seo/redirects endpoint.
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const rows = await prisma.seoRedirect.findMany({
        where: { isActive: true },
        select: { fromPath: true, toPath: true, statusCode: true },
      });
      await prisma.$disconnect();
      return rows.map(
        (r: { fromPath: string; toPath: string; statusCode: number }) => ({
          source: r.fromPath,
          destination: r.toPath,
          permanent: r.statusCode === 301,
        }),
      );
    } catch {
      // DB not available at build time (CI, first deploy) — return empty
      return [];
    }
  },
};

export default nextConfig;
