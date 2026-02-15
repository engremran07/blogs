import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import { sanitizeContent, sanitizeText } from "@/features/blog/server/sanitization.util";
import { countWords, calculateReadingTime } from "@/features/blog/server/constants";

const logger = createLogger("api/posts");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        categories: { select: { id: true, name: true, slug: true, color: true } },
        tags: { select: { id: true, name: true, slug: true, color: true } },
      },
    });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    logger.error("[api/posts/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();

    // Extract tag IDs if provided
    const tagIds: string[] | undefined = body.tagIds;
    delete body.tagIds;
    const categoryIds: string[] | undefined = body.categoryIds;
    delete body.categoryIds;

    // Allowlisted fields to prevent mass-assignment
    const ALLOWED_FIELDS = new Set([
      'title', 'slug', 'content', 'excerpt', 'status',
      'featuredImage', 'featuredImageAlt',
      'seoTitle', 'seoDescription', 'seoKeywords',
      'ogTitle', 'ogDescription', 'ogImage',
      'twitterTitle', 'twitterDescription', 'twitterImage', 'twitterCard',
      'isFeatured', 'isPinned', 'allowComments',
      'isGuestPost', 'guestAuthorName', 'guestAuthorEmail',
      'guestAuthorBio', 'guestAuthorAvatar', 'guestAuthorUrl',
      'canonicalUrl', 'language', 'region',
      'scheduledFor', 'publishedAt',
      'seriesId', 'seriesOrder',
      'password',
    ]);

    const safeData: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (ALLOWED_FIELDS.has(key)) {
        safeData[key] = body[key];
      }
    }

    // Sanitize slug
    if (safeData.slug && typeof safeData.slug === 'string') {
      safeData.slug = safeData.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    // Sanitize content and recalculate metrics
    if (typeof safeData.content === 'string') {
      safeData.content = sanitizeContent(safeData.content);
      const wc = countWords(safeData.content as string);
      safeData.wordCount = wc;
      safeData.readingTime = calculateReadingTime(wc);
    }
    if (typeof safeData.title === 'string') {
      safeData.title = sanitizeText(safeData.title);
    }
    if (typeof safeData.excerpt === 'string') {
      safeData.excerpt = sanitizeText(safeData.excerpt);
    }

    // Check post exists
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }

    // Check slug uniqueness
    if (safeData.slug) {
      const existing = await prisma.post.findFirst({
        where: { slug: safeData.slug as string, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json({ success: false, error: "Slug already in use" }, { status: 409 });
      }
    }

    // Handle status transitions
    if (safeData.status === 'PUBLISHED') {
      safeData.publishedAt = safeData.publishedAt ?? new Date();
    }
    if (safeData.status === 'ARCHIVED') {
      safeData.archivedAt = new Date();
    }
    if (safeData.status === 'SCHEDULED' && safeData.scheduledFor) {
      safeData.scheduledFor = new Date(safeData.scheduledFor as string);
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...safeData,
        ...(tagIds !== undefined && {
          tags: { set: tagIds.map((tid: string) => ({ id: tid })) },
        }),
        ...(categoryIds !== undefined && {
          categories: { set: categoryIds.map((cid: string) => ({ id: cid })) },
        }),
      },
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        tags: { select: { id: true, name: true, slug: true, color: true } },
        categories: true,
      },
    });

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    logger.error("[api/posts/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update post" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    // Fetch the post's categories before soft-deleting
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        categories: { select: { id: true, slug: true, name: true } },
      },
    });

    // Soft delete — also set status to ARCHIVED
    const now = new Date();
    await prisma.post.update({
      where: { id },
      data: { deletedAt: now, status: "ARCHIVED", archivedAt: now },
    });

    // Decrement category post counts
    if (post?.categories?.length) {
      await prisma.category.updateMany({
        where: { id: { in: post.categories.map((c: any) => c.id) } },
        data: { postCount: { decrement: 1 } },
      });
    }

    // Auto-exclude: check if any category now has zero published posts
    if (post?.categories?.length) {
      const orphanKeys: string[] = [];
      for (const cat of post.categories) {
        const remaining = await prisma.post.count({
          where: {
            categories: { some: { id: cat.id } },
            status: "PUBLISHED",
            deletedAt: null,
            id: { not: id },
          },
        });
        if (remaining === 0) {
          orphanKeys.push(`category:${cat.slug}`);
        }
      }
      if (orphanKeys.length > 0) {
        await removePageTypesFromSlots(prisma as any, orphanKeys);
        logger.info(`Auto-excluded orphan category pageTypes from ad slots: ${orphanKeys.join(", ")}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[api/posts/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
