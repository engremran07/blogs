import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { sanitizeContent, sanitizeText } from "@/features/blog/server/sanitization.util";
import {
  generateSlug, countWords, calculateReadingTime, generateExcerpt,
} from "@/features/blog/server/constants";

const logger = createLogger("api/posts");

/** Fields returned in list endpoints — excludes heavy `content` & sensitive `password`. */
const POST_LIST_SELECT = {
  id: true,
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
    const all = searchParams.get("all") === "true"; // admin: include all statuses

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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!["AUTHOR", "EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || body.title.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: "Title is required (min 5 characters)" },
        { status: 400 }
      );
    }
    const authorId = (session.user as any).id || body.authorId;

    // Sanitize inputs
    const title = sanitizeText(body.title);
    const content = body.content ? sanitizeContent(body.content) : "";
    const wordCount = body.wordCount ?? countWords(content);
    const readingTime = body.readingTime ?? calculateReadingTime(wordCount);
    const excerpt = body.excerpt ? sanitizeText(body.excerpt) : generateExcerpt(content, 200);

    // Sanitize slug
    if (body.slug) {
      body.slug = body.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }

    // Auto-generate unique slug if not provided
    const baseSlug = body.slug ? body.slug : generateSlug(title);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.post.findUnique({ where: { slug }, select: { id: true } })) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Extract tag/category IDs
    const tagIds: string[] | undefined = body.tagIds;
    const categoryIds: string[] | undefined = body.categoryIds;

    const allowedStatuses = ["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"];
    const status = allowedStatuses.includes(body.status) ? body.status : "DRAFT";

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        excerpt,
        status,
        authorId,
        featuredImage: body.featuredImage ?? null,
        featuredImageAlt: body.featuredImageAlt ?? null,
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        ogTitle: body.ogTitle ?? null,
        ogDescription: body.ogDescription ?? null,
        ogImage: body.ogImage ?? null,
        twitterTitle: body.twitterTitle ?? null,
        twitterDescription: body.twitterDescription ?? null,
        twitterImage: body.twitterImage ?? null,
        isFeatured: body.isFeatured ?? false,
        isPinned: body.isPinned ?? false,
        allowComments: body.allowComments ?? true,
        wordCount,
        readingTime,
        isGuestPost: body.isGuestPost ?? false,
        guestAuthorName: body.guestAuthorName ?? null,
        guestAuthorEmail: body.guestAuthorEmail ?? null,
        guestAuthorBio: body.guestAuthorBio ?? null,
        guestAuthorAvatar: body.guestAuthorAvatar ?? null,
        guestAuthorUrl: body.guestAuthorUrl ?? null,
        canonicalUrl: body.canonicalUrl ?? null,
        language: body.language ?? null,
        region: body.region ?? null,
        ...(status === "PUBLISHED" && { publishedAt: new Date() }),
        ...(status === "SCHEDULED" && body.scheduledFor && { scheduledFor: new Date(body.scheduledFor) }),
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

    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error) {
    logger.error("[api/posts] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to create post" },
      { status: 500 }
    );
  }
}
