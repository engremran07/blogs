import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { sanitizeContent, sanitizeText } from "@/features/blog/server/sanitization.util";
import {
  generateSlug, countWords, calculateReadingTime, generateExcerpt,
} from "@/features/blog/server/constants";
import { autoDistributePost } from "@/features/distribution";
import { InterlinkService } from "@/features/seo/server/interlink.service";
import type { InterlinkPrisma } from "@/features/seo/server/interlink.service";
import { CreatePostSchema } from "@/features/blog/server/schemas";

const logger = createLogger("api/posts");

/** Fields returned in list endpoints — excludes heavy `content` & sensitive `password`. */
const POST_LIST_SELECT = {
  id: true,
  postNumber: true,
  title: true,
  slug: true,
  excerpt: true,
  status: true,
  featuredImage: true,
  featuredImageAlt: true,
  seoTitle: true,
  seoDescription: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: true,
  viewCount: true,
  readingTime: true,
  wordCount: true,
  isFeatured: true,
  isPinned: true,
  pinOrder: true,
  allowComments: true,
  isGuestPost: true,
  guestAuthorName: true,
  publishedAt: true,
  scheduledFor: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { id: true, username: true, displayName: true } },
  categories: { select: { id: true, name: true, slug: true, color: true } },
  tags: { select: { id: true, name: true, slug: true, color: true } },
} as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const tagId = searchParams.get("tagId");
    const categoryId = searchParams.get("categoryId");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("take") || searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;
    const allParam = searchParams.get("all") === "true";

    // SEC-001: Gate ?all=true behind authentication — only content roles can see non-published posts
    let all = false;
    if (allParam) {
      const session = await auth();
      if (session?.user && ["AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
        all = true;
      }
    }

    const where: Record<string, unknown> = { deletedAt: null };
    if (!all) {
      where.status = status || "PUBLISHED";
    } else if (status) {
      where.status = status;
    }
    if (tagId) {
      where.tags = { some: { id: tagId } };
    }
    if (categoryId) {
      where.categories = { some: { id: categoryId } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    // Validate sortBy against allowed fields to prevent injection
    const allowedSortFields = ["createdAt", "updatedAt", "publishedAt", "title", "viewCount", "readingTime", "wordCount"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { [safeSortBy]: safeSortOrder },
        skip,
        take: limit,
        select: POST_LIST_SELECT,
      }),
      prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ success: true, data: posts, total, page, limit, totalPages });
  } catch (error) {
    logger.error("[api/posts] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const body = await req.json();

    // Inject authenticated user as author before validation
    body.authorId = userId;

    // Validate with Zod schema
    const parsed = CreatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const authorId = data.authorId;

    // Sanitize inputs
    const title = sanitizeText(data.title);
    const content = data.content ? sanitizeContent(data.content) : "";
    const wordCount = countWords(content);
    const readingTime = calculateReadingTime(wordCount);
    const excerpt = data.excerpt ? sanitizeText(data.excerpt) : generateExcerpt(content, 200);

    // Sanitize slug
    const sanitizedSlug = data.slug
      ? data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : null;

    // Auto-generate unique slug if not provided
    const baseSlug = sanitizedSlug || generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Extract tag/category IDs
    const tagIds = data.tagIds;
    const categoryIds = data.categoryIds;

    const status = data.status;

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status,
        authorId,
        featuredImage: data.featuredImage ?? null,
        featuredImageAlt: data.featuredImageAlt ?? null,
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
        ogTitle: data.ogTitle ?? null,
        ogDescription: data.ogDescription ?? null,
        ogImage: data.ogImage ?? null,
        twitterTitle: data.twitterTitle ?? null,
        twitterDescription: data.twitterDescription ?? null,
        twitterImage: data.twitterImage ?? null,
        isFeatured: data.isFeatured,
        isPinned: data.isPinned,
        allowComments: data.allowComments,
        wordCount,
        readingTime,
        isGuestPost: data.isGuestPost ?? false,
        guestAuthorName: data.guestAuthorName ?? null,
        guestAuthorEmail: data.guestAuthorEmail ?? null,
        guestAuthorBio: data.guestAuthorBio ?? null,
        guestAuthorAvatar: data.guestAuthorAvatar ?? null,
        guestAuthorUrl: data.guestAuthorUrl ?? null,
        canonicalUrl: data.canonicalUrl ?? null,
        language: data.language ?? null,
        region: data.region ?? null,
        ...(status === "PUBLISHED" && { publishedAt: new Date() }),
        ...(status === "SCHEDULED" && data.scheduledFor && { scheduledFor: new Date(data.scheduledFor) }),
        ...(tagIds?.length && {
          tags: { connect: tagIds.map((id: string) => ({ id })) },
        }),
        ...(categoryIds?.length && {
          categories: { connect: categoryIds.map((id: string) => ({ id })) },
        }),
      },
      include: {
        tags: { select: { id: true, name: true, slug: true, color: true } },
        categories: { select: { id: true, name: true, slug: true, color: true } },
      },
    });

    // Update category post counts
    if (categoryIds?.length) {
      await prisma.category.updateMany({
        where: { id: { in: categoryIds } },
        data: { postCount: { increment: 1 } },
      });
    }

    // Auto-distribute to channels with autoPublish on publish
    if (status === "PUBLISHED") {
      autoDistributePost(post.id).catch((err: unknown) =>
        logger.error("[api/posts] Auto-distribute error:", { error: err }),
      );
    }

    // Interlink lifecycle: scan for link suggestions
    new InterlinkService(prisma as unknown as InterlinkPrisma).onContentCreated(post.id, 'POST', status).catch((err: unknown) =>
      logger.error("[api/posts] Interlink onContentCreated error:", { error: err }),
    );

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    logger.error("[api/posts] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
