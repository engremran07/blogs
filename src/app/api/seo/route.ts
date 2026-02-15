import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { auditContent, aggregateSiteAudit, generateRecommendations } from "@/features/seo/server/seo-audit.util";
import { generateSeoTitle, generateSeoDescription, scoreTitleQuality, extractKeywords } from "@/features/seo/server/seo-text.util";
import type { AuditableContent, AuditResult, SiteAuditResult, SeoTargetType } from "@/features/seo/types";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/seo");

function toAuditableContent(post: Record<string, unknown>): AuditableContent {
  return {
    id: post.id as string,
    title: post.title as string,
    slug: post.slug as string,
    content: (post.content as string) || "",
    seoTitle: post.seoTitle as string | null,
    seoDescription: post.seoDescription as string | null,
    seoKeywords: (post.seoKeywords as string[]) || [],
    excerpt: post.excerpt as string | null,
    featuredImage: post.featuredImage as string | null,
    ogTitle: post.ogTitle as string | null,
    ogDescription: post.ogDescription as string | null,
    ogImage: post.ogImage as string | null,
    twitterCard: post.twitterCard as string | null,
    canonicalUrl: post.canonicalUrl as string | null,
    wordCount: post.wordCount as number,
    readingTime: post.readingTime as number,
    categories: (post.categories as { name: string; slug: string }[]) || [],
    tags: (post.tags as { name: string; slug: string }[]) || [],
    autoTags: (post.autoTags as string[]) || [],
    publishedAt: post.publishedAt as string | null,
    updatedAt: post.updatedAt as string | null,
    createdAt: post.createdAt as string | null,
    status: post.status as string,
  };
}

function pageToAuditableContent(page: Record<string, unknown>): AuditableContent {
  return {
    id: page.id as string,
    title: page.title as string,
    slug: page.slug as string,
    content: (page.content as string) || "",
    seoTitle: (page as Record<string, unknown>).metaTitle as string | null,
    seoDescription: (page as Record<string, unknown>).metaDescription as string | null,
    seoKeywords: [],
    excerpt: (page.excerpt as string) || null,
    featuredImage: (page.featuredImage as string) || null,
    ogTitle: (page as Record<string, unknown>).ogTitle as string | null,
    ogDescription: (page as Record<string, unknown>).ogDescription as string | null,
    ogImage: (page as Record<string, unknown>).ogImage as string | null,
    twitterCard: null,
    canonicalUrl: (page as Record<string, unknown>).canonicalUrl as string | null,
    wordCount: page.wordCount as number,
    readingTime: page.readingTime as number,
    categories: [],
    tags: [],
    autoTags: [],
    structuredData: (page.structuredData as Record<string, unknown>) || null,
    publishedAt: page.publishedAt as string | null,
    updatedAt: page.updatedAt as string | null,
    createdAt: page.createdAt as string | null,
    status: page.status as string,
  };
}

// GET /api/seo?action=audit-site|audit-post|audit-page|overview|suggestions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "overview";

  try {
    const session = await auth();
    if (!session?.user || !["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    if (action === "overview") {
      // Aggregate site-wide SEO stats
      const [posts, pages, totalPosts, totalPages] = await Promise.all([
        prisma.post.findMany({
          where: { deletedAt: null },
          select: {
            id: true, title: true, slug: true, content: true, status: true,
            seoTitle: true, seoDescription: true, seoKeywords: true,
            excerpt: true, featuredImage: true, ogTitle: true, ogDescription: true,
            ogImage: true, twitterCard: true, canonicalUrl: true,
            wordCount: true, readingTime: true, autoTags: true,
            publishedAt: true, updatedAt: true, createdAt: true,
            categories: { select: { name: true, slug: true } },
            tags: { select: { name: true, slug: true } },
          },
        }),
        prisma.page.findMany({
          where: { deletedAt: null },
          select: {
            id: true, title: true, slug: true, content: true, status: true,
            metaTitle: true, metaDescription: true, ogTitle: true, ogDescription: true,
            ogImage: true, canonicalUrl: true, wordCount: true, readingTime: true,
            excerpt: true, featuredImage: true, structuredData: true,
            publishedAt: true, updatedAt: true, createdAt: true,
          },
        }),
        prisma.post.count({ where: { deletedAt: null } }),
        prisma.page.count({ where: { deletedAt: null } }),
      ]);

      const postAudits: AuditResult[] = posts.map((p) =>
        auditContent(toAuditableContent(p as unknown as Record<string, unknown>), "POST")
      );
      const pageAudits: AuditResult[] = pages.map((p) =>
        auditContent(pageToAuditableContent(p as unknown as Record<string, unknown>), "PAGE")
      );

      const allAudits = [...postAudits, ...pageAudits];
      const avgScore = allAudits.length > 0
        ? Math.round(allAudits.reduce((s, a) => s + a.overallScore, 0) / allAudits.length)
        : 0;

      // Count issues by severity
      const issueCounts = { CRITICAL: 0, IMPORTANT: 0, OPTIONAL: 0, INFO: 0 };
      for (const audit of allAudits) {
        for (const check of audit.checks) {
          if (check.status === "fail" || check.status === "warn") {
            issueCounts[check.severity]++;
          }
        }
      }

      // Posts missing SEO fields
      const postsWithoutSeoTitle = posts.filter(p => !p.seoTitle).length;
      const postsWithoutSeoDesc = posts.filter(p => !p.seoDescription).length;
      const postsWithoutFeaturedImage = posts.filter(p => !p.featuredImage).length;
      const postsWithoutExcerpt = posts.filter(p => !p.excerpt).length;

      // Pages missing SEO fields
      const pagesWithoutMetaTitle = pages.filter(p => !p.metaTitle).length;
      const pagesWithoutMetaDesc = pages.filter(p => !p.metaDescription).length;

      // Score distribution
      const scoreDistribution = {
        excellent: allAudits.filter(a => a.overallScore >= 80).length,
        good: allAudits.filter(a => a.overallScore >= 60 && a.overallScore < 80).length,
        needsWork: allAudits.filter(a => a.overallScore >= 40 && a.overallScore < 60).length,
        poor: allAudits.filter(a => a.overallScore < 40).length,
      };

      // Worst content by score
      const worstContent = allAudits
        .sort((a, b) => a.overallScore - b.overallScore)
        .map(a => {
          const match = [...posts, ...pages].find(p => p.id === a.targetId);
          return {
            id: a.targetId,
            title: match?.title || "Unknown",
            type: a.targetType,
            score: a.overallScore,
            topIssues: a.checks
              .filter(c => c.status === "fail")
              .slice(0, 3)
              .map(c => c.message),
          };
        });

      return NextResponse.json({
        success: true,
        data: {
          overallScore: avgScore,
          totalPosts,
          totalPages,
          totalContent: totalPosts + totalPages,
          issueCounts,
          missingFields: {
            seoTitle: postsWithoutSeoTitle + pagesWithoutMetaTitle,
            seoDescription: postsWithoutSeoDesc + pagesWithoutMetaDesc,
            featuredImage: postsWithoutFeaturedImage,
            excerpt: postsWithoutExcerpt,
          },
          scoreDistribution,
          worstContent,
        },
      });
    }

    if (action === "audit-post") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

      const post = await prisma.post.findUnique({
        where: { id },
        include: { categories: { select: { name: true, slug: true } }, tags: { select: { name: true, slug: true } } },
      });
      if (!post) return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });

      const result = auditContent(toAuditableContent(post as unknown as Record<string, unknown>), "POST");
      const titleQuality = scoreTitleQuality(post.title);
      const keywords = extractKeywords(post.content, 10);

      return NextResponse.json({ success: true, data: { audit: result, titleQuality, keywords } });
    }

    if (action === "audit-page") {
      const id = searchParams.get("id");
      if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

      const page = await prisma.page.findUnique({ where: { id } });
      if (!page) return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });

      const result = auditContent(pageToAuditableContent(page as unknown as Record<string, unknown>), "PAGE");
      return NextResponse.json({ success: true, data: { audit: result } });
    }

    if (action === "audit-all") {
      const type = searchParams.get("type") || "all";

      const results: AuditResult[] = [];

      if (type === "all" || type === "posts") {
        const posts = await prisma.post.findMany({
          where: { deletedAt: null },
          include: { categories: { select: { name: true, slug: true } }, tags: { select: { name: true, slug: true } } },
        });
        for (const p of posts) {
          results.push(auditContent(toAuditableContent(p as unknown as Record<string, unknown>), "POST"));
        }
      }
      if (type === "all" || type === "pages") {
        const pages = await prisma.page.findMany({ where: { deletedAt: null } });
        for (const p of pages) {
          results.push(auditContent(pageToAuditableContent(p as unknown as Record<string, unknown>), "PAGE"));
        }
      }

      // Aggregate: join with content title
      const allContent = type !== "pages"
        ? await prisma.post.findMany({ where: { deletedAt: null }, select: { id: true, title: true, slug: true, status: true } })
        : [];
      const allPages = type !== "posts"
        ? await prisma.page.findMany({ where: { deletedAt: null }, select: { id: true, title: true, slug: true, status: true } })
        : [];
      const contentMap = new Map([...allContent, ...allPages].map(c => [c.id, c]));

      const enriched = results.map(r => ({
        ...r,
        title: contentMap.get(r.targetId)?.title || "Unknown",
        slug: contentMap.get(r.targetId)?.slug || "",
        status: contentMap.get(r.targetId)?.status || "",
        failCount: r.checks.filter(c => c.status === "fail").length,
        warnCount: r.checks.filter(c => c.status === "warn").length,
        passCount: r.checks.filter(c => c.status === "pass").length,
      }));

      return NextResponse.json({ success: true, data: enriched });
    }

    if (action === "generate-meta") {
      const id = searchParams.get("id");
      const type = searchParams.get("type") || "post";
      if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

      let content: { title: string; content: string; excerpt?: string | null } | null = null;
      if (type === "post") {
        content = await prisma.post.findUnique({ where: { id }, select: { title: true, content: true, excerpt: true } });
      } else {
        content = await prisma.page.findUnique({ where: { id }, select: { title: true, content: true, excerpt: true } });
      }
      if (!content) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

      const suggestedTitle = generateSeoTitle(content.title);
      const keywords = extractKeywords(content.content, 10);
      const keywordStrings = keywords.map((k) => k.term);
      const suggestedDescription = generateSeoDescription(content.content, keywordStrings, 155);

      return NextResponse.json({
        success: true,
        data: { suggestedTitle, suggestedDescription, keywords },
      });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("SEO API error:", { error });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
