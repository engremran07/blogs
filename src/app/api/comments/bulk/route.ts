import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { moderationService } from "@/server/wiring";
import { bulkIdsSchema } from "@/features/comments/server/schemas";
import { MAX_BULK_IDS } from "@/features/comments/server/constants";

const logger = createLogger("api/comments/bulk");

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    const role = session.user.role;
    if (!["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }
    const body = await req.json();
    const { action, ids } = body;

    // Validate IDs with Zod schema
    const parsed = bulkIdsSchema.safeParse({ ids });
    if (!parsed.success) {
      const errors = parsed.error.flatten().formErrors;
      return NextResponse.json(
        { success: false, error: errors.length > 0 ? errors : 'Invalid input' },
        { status: 400 }
      );
    }

    if (ids.length > MAX_BULK_IDS) {
      return NextResponse.json(
        { success: false, error: `Cannot process more than ${MAX_BULK_IDS} items at once` },
        { status: 400 }
      );
    }

    const moderatorId = session.user.id || "system";

    switch (action) {
      case "delete": {
        // Soft delete — NOT hard delete
        const count = await moderationService.bulkDelete(ids);
        return NextResponse.json({ success: true, message: `${count} comments deleted` });
      }
      case "approve": {
        const count = await moderationService.bulkApprove(ids, moderatorId);
        return NextResponse.json({ success: true, message: `${count} comments approved` });
      }
      case "reject": {
        const count = await moderationService.bulkReject(ids, moderatorId);
        return NextResponse.json({ success: true, message: `${count} comments rejected` });
      }
      case "spam": {
        const count = await moderationService.bulkMarkAsSpam(ids, moderatorId);
        return NextResponse.json({ success: true, message: `${count} comments marked as spam` });
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[api/comments/bulk] POST error:", { error });
    return NextResponse.json({ success: false, error: "Bulk action failed" }, { status: 500 });
  }
}
