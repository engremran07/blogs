import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
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
    const { userId, userRole, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;
    const body = await req.json();

    // Admin moderation actions (status change) — editors+ only
    if (body.status && Object.keys(body).length === 1) {
      const allowedModRoles = ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"];
      if (!allowedModRoles.includes(userRole)) {
        return NextResponse.json(
          { success: false, error: "Only editors and admins can moderate comments" },
          { status: 403 }
        );
      }
      const status = body.status as string;
      const moderatorId = userId || "system";
      let comment;
      switch (status) {
        case "APPROVED":
          comment = await moderationService.approve(id, moderatorId);
          break;
        case "REJECTED":
          comment = await moderationService.reject(id, moderatorId);
          break;
        case "SPAM": {
          comment = await moderationService.markAsSpam(id, moderatorId);
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

    const comment = await commentService.update(id, parsed.data, userId);
    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to update comment";
    const status = errMsg.includes("not found") ? 404
      : errMsg.includes("Not authorised") ? 403
      : errMsg.includes("window") ? 400
      : 500;
    logger.error("[api/comments/[id]] PATCH error:", { error });
    return NextResponse.json({ success: false, error: errMsg }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId, userRole, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;
    // Admins can delete any comment; regular users can only delete their own
    const isAdminRole = ["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(userRole);
    const ownerFilter = isAdminRole ? undefined : userId;
    await commentService.softDelete(id, ownerFilter);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to delete comment";
    logger.error("[api/comments/[id]] DELETE error:", { error });
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: errMsg.includes("not found") ? 404 : errMsg.includes("Not authorised") ? 403 : 500 }
    );
  }
}
