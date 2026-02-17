import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/_next/", "/login", "/register", "/profile", "/search"],
      },
      // Block AI scrapers
      ...[
        "GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "ClaudeBot",
        "Google-Extended", "Bytespider", "Omgilibot", "FacebookBot",
      ].map((ua) => ({ userAgent: ua, disallow: ["/"] })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
