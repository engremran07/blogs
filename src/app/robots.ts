import type { MetadataRoute } from "next";
import { siteSettingsService } from "@/server/wiring";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = SITE_URL.replace(/\/$/, "");

  // Read DB settings for custom robots.txt and sitemap toggle
  try {
    const s = await siteSettingsService.getSettings();
    const raw = s as unknown as Record<string, unknown>;
    const sitemapEnabled = raw.sitemapEnabled !== false;
    const customRobotsTxt = raw.robotsTxtCustom as string | null;

    if (customRobotsTxt && customRobotsTxt.trim()) {
      // Parse custom robots.txt into structured format
      const rules: Array<{ userAgent: string; allow: string[]; disallow: string[] }> = [];
      let currentAgent: { userAgent: string; allow: string[]; disallow: string[] } | null = null;

      for (const line of customRobotsTxt.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const [directive, ...rest] = trimmed.split(":");
        const value = rest.join(":").trim();
        const lowerDir = directive.toLowerCase().trim();

        if (lowerDir === "user-agent") {
          if (currentAgent) rules.push(currentAgent);
          currentAgent = { userAgent: value, allow: [], disallow: [] };
        } else if (lowerDir === "allow" && currentAgent) {
          currentAgent.allow.push(value);
        } else if (lowerDir === "disallow" && currentAgent) {
          currentAgent.disallow.push(value);
        }
      }
      if (currentAgent) rules.push(currentAgent);

      return {
        rules: rules.length > 0 ? rules : [{ userAgent: "*", allow: ["/"] }],
        ...(sitemapEnabled ? { sitemap: `${baseUrl}/sitemap.xml` } : {}),
      };
    }
  } catch {
    // Fall through to defaults
  }

  // Default robots rules
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
