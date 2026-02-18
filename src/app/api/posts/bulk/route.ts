import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/posts/bulk");

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

    const { action, ids } = await req.json();

    if (!ids?.length) {
      return NextResponse.json({ success: false, error: "No IDs provided" }, { status: 400 });
    }

    if (ids.length > 100) {
      return NextResponse.json({ success: false, error: "Maximum 100 items per bulk operation" }, { status: 400 });
    }

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
