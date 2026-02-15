import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { mediaService } from "@/server/wiring";
import { createLogger } from "@/server/observability/logger";

const cleanupBodySchema = z.object({
  action: z.enum(["orphans", "purge"]),
  olderThan: z.string().datetime().optional(),
});

const logger = createLogger("api/media/cleanup");

/**
 * POST /api/media/cleanup — Cleanup orphaned files and purge soft-deleted items.
 * Body shape: { action: "orphans" | "purge" }
 * Admin-only endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = (session.user as { role?: string })?.role;
    if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const raw = await req.json();
    const parsed = cleanupBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { action, olderThan: olderThanStr } = parsed.data;

    switch (action) {
      case "orphans": {
        const result = await mediaService.cleanupOrphaned();
        return NextResponse.json(result);
      }

      case "purge": {
        const olderThan = olderThanStr ? new Date(olderThanStr) : undefined;
        const result = await mediaService.purgeDeleted(olderThan);
        return NextResponse.json(result);
      }
    }
  } catch (error) {
    logger.error("[api/media/cleanup] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Cleanup operation failed" },
      { status: 500 }
    );
  }
}
