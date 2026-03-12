/**
 * Centralized sitemap generation — single source of truth.
 *
 * All sitemap routes delegate to these helpers.
 * XSL stylesheet, sitemap index, and sub-sitemaps are all generated here.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { siteSettingsService } from "@/server/wiring";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

// ── Shared helpers ──────────────────────────────────────────────────────────

function xmlResponse(xml: string): NextResponse {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface UrlEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}

function buildUrlset(urls: UrlEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap-style.xsl"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;
}

// ── Sitemap index ───────────────────────────────────────────────────────────

export async function generateSitemapIndex(): Promise<NextResponse> {
  try {
    const s = await siteSettingsService.getSettings();
    if (s.sitemapEnabled === false) {
      return new NextResponse("Sitemap generation is disabled.", {
        status: 404,
      });
    }
  } catch {
    /* continue with defaults */
  }

  const sitemaps = [
    `${SITE_URL}/sitemap-posts.xml`,
    `${SITE_URL}/sitemap-pages.xml`,
    `${SITE_URL}/sitemap-categories.xml`,
    `${SITE_URL}/sitemap-tags.xml`,
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/sitemap-style.xsl"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps
  .map(
    (url) => `  <sitemap>
    <loc>${escapeXml(url)}</loc>
  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

  return xmlResponse(xml);
}

// ── Posts sitemap ───────────────────────────────────────────────────────────

export async function generatePostsSitemap(): Promise<NextResponse> {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null, noIndex: { not: true } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const urls: UrlEntry[] = posts.map((p) => ({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: p.updatedAt.toISOString(),
    changefreq: "weekly",
    priority: "0.8",
  }));

  return xmlResponse(buildUrlset(urls));
}

// ── Pages sitemap ───────────────────────────────────────────────────────────

export async function generatePagesSitemap(): Promise<NextResponse> {
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED", deletedAt: null, noIndex: { not: true } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const urls: UrlEntry[] = [
    {
      loc: SITE_URL,
      lastmod: new Date().toISOString(),
      changefreq: "daily",
      priority: "1.0",
    },
    ...pages.map((p) => ({
      loc: `${SITE_URL}/${p.slug}`,
      lastmod: p.updatedAt.toISOString(),
      changefreq: "monthly",
      priority: "0.7",
    })),
  ];

  return xmlResponse(buildUrlset(urls));
}

// ── Categories sitemap ──────────────────────────────────────────────────────

export async function generateCategoriesSitemap(): Promise<NextResponse> {
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const urls: UrlEntry[] = categories.map((c) => ({
    loc: `${SITE_URL}/blog?category=${c.slug}`,
    lastmod: c.updatedAt.toISOString(),
    changefreq: "weekly",
    priority: "0.6",
  }));

  return xmlResponse(buildUrlset(urls));
}

// ── Tags sitemap ────────────────────────────────────────────────────────────

export async function generateTagsSitemap(): Promise<NextResponse> {
  const tags = await prisma.tag.findMany({
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const urls: UrlEntry[] = tags.map((t) => ({
    loc: `${SITE_URL}/blog?tag=${t.slug}`,
    lastmod: t.updatedAt.toISOString(),
    changefreq: "weekly",
    priority: "0.5",
  }));

  return xmlResponse(buildUrlset(urls));
}

// ── XSL stylesheet ─────────────────────────────────────────────────────────

export function generateXslStylesheet(): NextResponse {
  const xsl = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title>XML Sitemap</title>
        <meta name="robots" content="noindex, follow"/>
        <style type="text/css">
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: #f8fafc; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
          h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem; }
          .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
          .count { background: #e2e8f0; color: #475569; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem; }
          table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 0.5rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }
          td { padding: 0.625rem 1rem; border-top: 1px solid #e2e8f0; font-size: 0.875rem; }
          tr:hover td { background: #f8fafc; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .priority { text-align: center; }
          .date { color: #64748b; white-space: nowrap; }
          .freq { color: #64748b; text-transform: capitalize; }
          footer { text-align: center; margin-top: 2rem; color: #94a3b8; font-size: 0.75rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Sitemap Index -->
          <xsl:if test="sitemap:sitemapindex">
            <h1>XML Sitemap Index</h1>
            <p class="subtitle">
              This sitemap index contains
              <span class="count"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></span>
              sitemaps.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Sitemap URL</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                  <tr>
                    <td><a><xsl:attribute name="href"><xsl:value-of select="sitemap:loc"/></xsl:attribute><xsl:value-of select="sitemap:loc"/></a></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>

          <!-- URL Set -->
          <xsl:if test="sitemap:urlset">
            <h1>XML Sitemap</h1>
            <p class="subtitle">
              This sitemap contains
              <span class="count"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span>
              URLs.
            </p>
            <table>
              <thead>
                <tr>
                  <th>URL</th>
                  <th style="width:120px">Priority</th>
                  <th style="width:120px">Change Freq</th>
                  <th style="width:180px">Last Modified</th>
                </tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <xsl:sort select="sitemap:priority" order="descending"/>
                  <tr>
                    <td><a><xsl:attribute name="href"><xsl:value-of select="sitemap:loc"/></xsl:attribute><xsl:value-of select="sitemap:loc"/></a></td>
                    <td class="priority"><xsl:value-of select="sitemap:priority"/></td>
                    <td class="freq"><xsl:value-of select="sitemap:changefreq"/></td>
                    <td class="date"><xsl:value-of select="substring(sitemap:lastmod, 1, 10)"/></td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </xsl:if>

          <footer>
            Generated by MyBlog Sitemap Engine
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>`;

  return new NextResponse(xsl, {
    headers: {
      "Content-Type": "text/xsl; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
