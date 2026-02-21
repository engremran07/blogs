import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { removePageTypesFromSlots } from "@/features/ads/server/scan-pages";
import type { ScanPrisma } from "@/features/ads/server/scan-pages";
import {
  sanitizeContent,
  sanitizeText,
} from "@/features/blog/server/sanitization.util";
import {
  countWords,
  calculateReadingTime,
} from "@/features/blog/server/constants";
import { UpdatePostSchema } from "@/features/blog/server/schemas";
import { autoDistributePost } from "@/features/distribution";
import {
  InterlinkService,
  type InterlinkPrisma,
} from "@/features/seo/server/interlink.service";

const logger = createLogger("api/posts");

const interlinkPrisma: InterlinkPrisma = {
  post: {
    findMany: (args) => prisma.post.findMany(args as never),
    findUnique: (args) => prisma.post.findUnique(args as never),
    update: (args) => prisma.post.update(args as never),
    count: (args) => prisma.post.count(args as never),
  },
  page: {
    findMany: (args) => prisma.page.findMany(args as never),
    findUnique: (args) => prisma.page.findUnique(args as never),
    update: (args) => prisma.page.update(args as never),
    count: (args) => prisma.page.count(args as never),
  },
  internalLink: {
    findMany: (args) => prisma.internalLink.findMany(args as never),
    findFirst: (args) => prisma.internalLink.findFirst(args as never),
    findUnique: (args) => prisma.internalLink.findUnique(args as never),
    create: (args) => prisma.internalLink.create(args as never),
    update: (args) => prisma.internalLink.update(args as never),
    updateMany: (args) => prisma.internalLink.updateMany(args as never),
    delete: (args) => prisma.internalLink.delete(args as never),
    deleteMany: (args) => prisma.internalLink.deleteMany(args as never),
    count: (args) => prisma.internalLink.count(args as never),
    upsert: (args) => prisma.internalLink.upsert(args as never),
  },
  interlinkExclusion: {
    findMany: (args) => prisma.interlinkExclusion.findMany(args as never),
    create: (args) => prisma.interlinkExclusion.create(args as never),
    delete: (args) => prisma.interlinkExclusion.delete(args as never),
    deleteMany: (args) => prisma.interlinkExclusion.deleteMany(args as never),
    count: (args) => prisma.interlinkExclusion.count(args as never),
  },
};

const scanPrisma: ScanPrisma = {
  category: { findMany: (args) => prisma.category.findMany(args as never) },
  tag: { findMany: (args) => prisma.tag.findMany(args as never) },
  page: { findMany: (args) => prisma.page.findMany(args as never) },
  post: {
    count: (args) => prisma.post.count(args as never),
    findMany: (args) => prisma.post.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
    update: (args) => prisma.adSlot.update(args as never),
  },
};

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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
    const post = await resolvePost(identifier);

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    logger.error("[api/posts/[id]] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch post" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
    const id = await resolvePostId(identifier);
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 },
      );
    }
    const { userId, userRole, errorResponse } = await requireAuth({
      level: "author",
    });
    if (errorResponse) return errorResponse;

    // AUTHORs can only edit their own posts
    if (userRole === "AUTHOR") {
      const existingPost = await prisma.post.findUnique({
        where: { id },
        select: { authorId: true },
      });
      if (!existingPost) {
        return NextResponse.json(
          { success: false, error: "Post not found" },
          { status: 404 },
        );
      }
      if (existingPost.authorId !== userId) {
        return NextResponse.json(
          { success: false, error: "You can only edit your own posts" },
          { status: 403 },
        );
      }
    }

    const body = await req.json();

    // Validate input with Zod schema (replaces manual allowlist)
    const parsed = UpdatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    // Extract tag/category IDs from validated data
    const { tagIds, categoryIds, ...rest } = parsed.data;
    const safeData: Record<string, unknown> = { ...rest };

    // Sanitize slug
    if (safeData.slug && typeof safeData.slug === "string") {
      safeData.slug = safeData.slug
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    // Sanitize content and recalculate metrics
    if (typeof safeData.content === "string") {
      safeData.content = sanitizeContent(safeData.content);
      const wc = countWords(safeData.content as string);
      safeData.wordCount = wc;
      safeData.readingTime = calculateReadingTime(wc);
    }
    if (typeof safeData.title === "string") {
      safeData.title = sanitizeText(safeData.title);
    }
    if (typeof safeData.excerpt === "string") {
      safeData.excerpt = sanitizeText(safeData.excerpt);
    }

    // Check post exists
    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 },
      );
    }

    // Check slug uniqueness
    if (safeData.slug) {
      const existing = await prisma.post.findFirst({
        where: {
          slug: safeData.slug as string,
          id: { not: id },
          deletedAt: null,
        },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Slug already in use" },
          { status: 409 },
        );
      }
    }

    // Handle status transitions
    if (safeData.status === "PUBLISHED") {
      safeData.publishedAt = safeData.publishedAt ?? new Date();
    }
    if (safeData.status === "ARCHIVED") {
      safeData.archivedAt = new Date();
    }
    if (safeData.status === "SCHEDULED" && safeData.scheduledFor) {
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
    if (
      safeData.status === "PUBLISHED" &&
      existingPost.status !== "PUBLISHED"
    ) {
      autoDistributePost(post.id).catch((err: unknown) =>
        logger.error("[api/posts/[id]] Auto-distribute error:", { error: err }),
      );
    }

    // Interlink lifecycle: handle slug changes, re-scan on content/status change
    const interlinkChanges: {
      slug?: { old: string; new: string };
      statusChanged?: boolean;
      contentChanged?: boolean;
    } = {};
    if (safeData.slug && safeData.slug !== existingPost.slug) {
      interlinkChanges.slug = {
        old: existingPost.slug,
        new: safeData.slug as string,
      };
    }
    if (safeData.status && safeData.status !== existingPost.status) {
      interlinkChanges.statusChanged = true;
      // If unpublishing, trigger onContentUnpublished
      if (
        existingPost.status === "PUBLISHED" &&
        safeData.status !== "PUBLISHED"
      ) {
        new InterlinkService(interlinkPrisma)
          .onContentUnpublished(id, "POST", existingPost.slug)
          .catch((err: unknown) =>
            logger.error(
              "[api/posts/[id]] Interlink onContentUnpublished error:",
              { error: err },
            ),
          );
      }
    }
    if (safeData.content) interlinkChanges.contentChanged = true;
    if (Object.keys(interlinkChanges).length > 0) {
      new InterlinkService(interlinkPrisma)
        .onContentUpdated(id, "POST", interlinkChanges)
        .catch((err: unknown) =>
          logger.error("[api/posts/[id]] Interlink onContentUpdated error:", {
            error: err,
          }),
        );
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    logger.error("[api/posts/[id]] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update post" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: identifier } = await params;
    const id = await resolvePostId(identifier);
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 },
      );
    }
    const { errorResponse } = await requireAuth({ level: "moderator" });
    if (errorResponse) return errorResponse;

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
      const deletedPost = await prisma.post.findUnique({
        where: { id },
        select: { slug: true },
      });
      if (deletedPost) {
        new InterlinkService(interlinkPrisma)
          .onContentDeleted(id, "POST", deletedPost.slug)
          .catch((err: unknown) =>
            logger.error("[api/posts/[id]] Interlink onContentDeleted error:", {
              error: err,
            }),
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
        await removePageTypesFromSlots(scanPrisma, orphanKeys);
        logger.info(
          `Auto-excluded orphan category pageTypes from ad slots: ${orphanKeys.join(", ")}`,
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("[api/posts/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to delete post" },
      { status: 500 },
    );
  }
}
