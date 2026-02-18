import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import { sanitizeContent, sanitizeText } from "@/features/blog/server/sanitization.util";
import { countWords, calculateReadingTime } from "@/features/blog/server/constants";
import { autoDistributePost } from "@/features/distribution";
import { InterlinkService, type InterlinkPrisma } from "@/features/seo/server/interlink.service";

const logger = createLogger("api/posts");

const POST_INCLUDE = {
  author: { select: { id: true, username: true, displayName: true } },
  categories: { select: { id: true, name: true, slug: true, color: true } },
  tags: { select: { id: true, name: true, slug: true, color: true } },
};

/**
 * Resolve the [id] param to a post record.
 * Accepts a numeric postNumber (e.g. "42") or a cuid string.
 */
async function resolvePost(identifier: string) {
  const num = /^\d+$/.test(identifier) ? parseInt(identifier, 10) : NaN;
  if (!isNaN(num)) {
    return prisma.post.findUnique({
      where: { postNumber: num, deletedAt: null },
      include: POST_INCLUDE,
    });
  }
  return prisma.post.findUnique({
    where: { id: identifier, deletedAt: null },
    include: POST_INCLUDE,
  });
}

/**
 * Resolve identifier to the cuid id (for update/delete operations).
 */
async function resolvePostId(identifier: string): Promise<string | null> {
  const num = /^\d+$/.test(identifier) ? parseInt(identifier, 10) : NaN;
  if (!isNaN(num)) {
    const post = await prisma.post.findUnique({
      where: { postNumber: num },
      select: { id: true },
    });
    return post?.id ?? null;
  }
  return identifier;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: identifier } = await params;
    const post = await resolvePost(identifier);

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
    const { id: identifier } = await params;
    const id = await resolvePostId(identifier);
    if (!id) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = session.user.role;
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

    // Auto-distribute when status transitions to PUBLISHED
    if (safeData.status === 'PUBLISHED' && existingPost.status !== 'PUBLISHED') {
      autoDistributePost(post.id).catch((err: unknown) =>
        logger.error("[api/posts/[id]] Auto-distribute error:", { error: err }),
      );
    }

    // Interlink lifecycle: handle slug changes, re-scan on content/status change
    const interlinkChanges: { slug?: { old: string; new: string }; statusChanged?: boolean; contentChanged?: boolean } = {};
    if (safeData.slug && safeData.slug !== existingPost.slug) {
      interlinkChanges.slug = { old: existingPost.slug, new: safeData.slug as string };
    }
    if (safeData.status && safeData.status !== existingPost.status) {
      interlinkChanges.statusChanged = true;
      // If unpublishing, trigger onContentUnpublished
      if (existingPost.status === 'PUBLISHED' && safeData.status !== 'PUBLISHED') {
        new InterlinkService(prisma as unknown as InterlinkPrisma).onContentUnpublished(id, 'POST', existingPost.slug).catch((err: unknown) =>
          logger.error("[api/posts/[id]] Interlink onContentUnpublished error:", { error: err }),
        );
      }
    }
    if (safeData.content) interlinkChanges.contentChanged = true;
    if (Object.keys(interlinkChanges).length > 0) {
      new InterlinkService(prisma as unknown as InterlinkPrisma).onContentUpdated(id, 'POST', interlinkChanges).catch((err: unknown) =>
        logger.error("[api/posts/[id]] Interlink onContentUpdated error:", { error: err }),
      );
    }

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
    const { id: identifier } = await params;
    const id = await resolvePostId(identifier);
    if (!id) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 });
    }
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = session.user.role;
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
        where: { id: { in: post.categories.map((c) => c.id) } },
        data: { postCount: { decrement: 1 } },
      });
    }

    // Interlink lifecycle: handle deleted post
    if (post?.categories?.length || true) {
      const deletedPost = await prisma.post.findUnique({ where: { id }, select: { slug: true } });
      if (deletedPost) {
        new InterlinkService(prisma as unknown as InterlinkPrisma).onContentDeleted(id, 'POST', deletedPost.slug).catch((err: unknown) =>
          logger.error("[api/posts/[id]] Interlink onContentDeleted error:", { error: err }),
        );
      }
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
        await removePageTypesFromSlots(prisma as unknown as ScanPrisma, orphanKeys);
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
