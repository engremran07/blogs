import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export async function GET() {
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED", deletedAt: null, noIndex: { not: true } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const urls = [
    {
      loc: SITE_URL,
      priority: "1.0",
      changefreq: "daily",
      lastmod: new Date().toISOString(),
    },
    ...pages.map((p) => ({
      loc: `${SITE_URL}/${p.slug}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: p.updatedAt.toISOString(),
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="${SITE_URL}/sitemap-style.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
