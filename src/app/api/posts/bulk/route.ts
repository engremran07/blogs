import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/posts/bulk");

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const rawBody = await req.json();

    // Validate with Zod
    const VALID_ACTIONS = ["delete", "publish", "draft", "archive"] as const;
    const bulkSchema = z.object({
      action: z.enum(VALID_ACTIONS),
      ids: z.array(z.string().min(1)).min(1).max(100),
    });
    const parsed = bulkSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().formErrors.join(", ") || "Invalid input" },
        { status: 400 }
      );
    }
    const { action, ids } = parsed.data;

    switch (action) {
      case "delete": {
        await prisma.post.updateMany({
          where: { id: { in: ids } },
          data: { deletedAt: new Date(), status: "ARCHIVED", archivedAt: new Date() },
        });
        return NextResponse.json({ success: true, message: `${ids.length} posts deleted` });
      }
      case "publish": {
        await prisma.post.updateMany({
          where: { id: { in: ids } },
          data: { status: "PUBLISHED", publishedAt: new Date() },
        });
        return NextResponse.json({ success: true, message: `${ids.length} posts published` });
      }
      case "draft": {
        await prisma.post.updateMany({
          where: { id: { in: ids } },
          data: { status: "DRAFT" },
        });
        return NextResponse.json({ success: true, message: `${ids.length} posts moved to draft` });
      }
      case "archive": {
        await prisma.post.updateMany({
          where: { id: { in: ids } },
          data: { status: "ARCHIVED", archivedAt: new Date() },
        });
        return NextResponse.json({ success: true, message: `${ids.length} posts archived` });
      }
      default:
        return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    logger.error("[api/posts/bulk] POST error:", { error });
    return NextResponse.json({ success: false, error: "Bulk action failed" }, { status: 500 });
  }
}
