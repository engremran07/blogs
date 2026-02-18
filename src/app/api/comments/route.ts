import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";
import { commentService, moderationService, captchaVerificationService, captchaAdminSettings } from "@/server/wiring";
import { createCommentSchema, queryCommentsSchema, type QueryCommentsPayload } from "@/features/comments/server/schemas";
import { Sanitize } from "@/features/comments/server/sanitization";

const logger = createLogger("api/comments");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";

    // Admin panel query — delegate to ModerationService with full pagination
    if (all) {
      const session = await auth();
      if (!session?.user || !["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      const parsed = queryCommentsSchema.safeParse({
        page: searchParams.get("page") ?? (searchParams.has("skip")
          ? Math.floor(parseInt(searchParams.get("skip") || "0", 10) / parseInt(searchParams.get("take") || "20", 10)) + 1
          : 1),
        limit: searchParams.get("take") ?? searchParams.get("limit") ?? 20,
        status: searchParams.get("status") || undefined,
        postId: searchParams.get("postId") || undefined,
        search: searchParams.get("search") ? Sanitize.text(searchParams.get("search")!) : undefined,
        sortBy: searchParams.get("sortBy") || undefined,
        sortOrder: searchParams.get("sortOrder") || undefined,
      });
      const query: Partial<QueryCommentsPayload> = parsed.success ? parsed.data : {};
      const result = await moderationService.findAll(query as QueryCommentsPayload);
      // include relations for admin view
      const enriched = await prisma.comment.findMany({
        where: { id: { in: result.data.map((c) => c.id) } },
        orderBy: { createdAt: "desc" },
        include: {
          post: { select: { id: true, title: true, slug: true } },
          user: { select: { id: true, username: true, displayName: true } },
        },
      });
      // Preserve order from result
      const byId = new Map(enriched.map((c) => [c.id, c]));
      const ordered = result.data.map((c) => byId.get(c.id) ?? c);
      return NextResponse.json({
        success: true,
        data: ordered,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    }

    // Public query — only approved, non-deleted comments for a post
    const postId = searchParams.get("postId");
    if (!postId) {
      return NextResponse.json(
        { success: false, error: "postId is required for public queries" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      commentService.findByPost(postId, { skip, take: limit }),
      commentService.countByPost(postId),
    ]);
    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({ success: true, data: comments, total, page, limit, totalPages });
  } catch (error) {
    logger.error("[api/comments] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── CAPTCHA verification ──
    const captchaRequired = await captchaAdminSettings.isCaptchaRequired({
      service: 'comments',
    });

    if (captchaRequired.required) {
      const { captchaToken, captchaType, captchaId } = body;
      if (!captchaToken) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification is required" },
          { status: 400 },
        );
      }

      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "127.0.0.1";

      const captchaResult = await captchaVerificationService.verify({
        token: captchaToken,
        clientIp,
        captchaType,
        captchaId,
      });

      if (!captchaResult.success) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification failed" },
          { status: 403 },
        );
      }
    }

    // Validate input with Zod schema
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().formErrors;
      return NextResponse.json(
        { success: false, error: errors.length > 0 ? errors : 'Invalid input' },
        { status: 400 }
      );
    }

    // Extract request metadata for spam analysis & IP blocking
    const meta = {
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? req.headers.get("x-real-ip")
        ?? undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    };

    // Delegate to CommentService (handles kill-switch, guest check, rate limit,
    // blocked IP/email, XSS sanitization, spam analysis, threading depth, profanity filter)
    const comment = await commentService.create(parsed.data, meta);

    return NextResponse.json({ success: true, data: comment }, { status: 201 });
  } catch (error) {
    const message = "Failed to create comment";
    const status = message.includes("disabled") || message.includes("blocked") || message.includes("closed")
      ? 403
      : message.includes("Rate limit") || message.includes("Max")
        ? 429
        : message.includes("depth") || message.includes("not allowed")
          ? 400
          : 500;
    logger.error("[api/comments] POST error:", { error });
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
