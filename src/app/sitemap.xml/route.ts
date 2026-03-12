import { NextResponse } from "next/server";
import { siteSettingsService } from "@/server/wiring";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export async function GET() {
  try {
    const s = await siteSettingsService.getSettings();
    if (s.sitemapEnabled === false) {
      return new NextResponse("Sitemap generation is disabled.", {
        status: 404,
      });
    }
  } catch {
    /* continue */
  }

  const sitemaps = [
    `${SITE_URL}/sitemap-posts.xml`,
    `${SITE_URL}/sitemap-pages.xml`,
    `${SITE_URL}/sitemap-categories.xml`,
    `${SITE_URL}/sitemap-tags.xml`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${SITE_URL}/sitemap-style.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (url) => `  <sitemap>
    <loc>${url}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
