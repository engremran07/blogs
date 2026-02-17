import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { commentService, moderationService } from "@/server/wiring";
import { updateCommentSchema } from "@/features/comments/server/schemas";

const logger = createLogger("api/comments");

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
    const body = await req.json();

    // Admin moderation actions (status change)
    if (body.status && Object.keys(body).length === 1) {
      const status = body.status as string;
      // TODO: extract real moderatorId from session
      const moderatorId = (session.user as any).id || "system";
      let comment;
      switch (status) {
        case "APPROVED":
          comment = await moderationService.approve(id, moderatorId);
          break;
        case "REJECTED":
          comment = await moderationService.reject(id, moderatorId);
          break;
        case "SPAM": {
          // ModerationService doesn't have a dedicated spam method,
          // so update directly with status and spamScore
          const { prisma } = await import("@/server/db/prisma");
          comment = await prisma.comment.update({
            where: { id },
            data: { status: "SPAM", spamScore: 1.0 },
          });
          break;
        }
        default:
          return NextResponse.json(
            { success: false, error: `Invalid status: ${status}` },
            { status: 400 }
          );
      }
      return NextResponse.json({ success: true, data: comment });
    }

    // User content edit — validate and delegate to CommentService
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.flatten().formErrors;
      return NextResponse.json(
        { success: false, error: errors.length > 0 ? errors : 'Invalid input' },
        { status: 400 }
      );
    }

    // TODO: extract real userId from session for ownership check
    const userId = body.userId as string | undefined;
    const comment = await commentService.update(id, parsed.data, userId);
    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    const message = "Failed to update comment";
    const status = message.includes("not found") ? 404
      : message.includes("Not authorised") ? 403
      : message.includes("window") ? 400
      : 500;
    logger.error("[api/comments/[id]] PATCH error:", { error });
    return NextResponse.json({ success: false, error: message }, { status });
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
    // TODO: extract real userId from session for ownership check
    await commentService.softDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = "Failed to delete comment";
    logger.error("[api/comments/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: message },
      { status: message.includes("not found") ? 404 : 500 }
    );
  }
}
