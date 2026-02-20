import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { createLogger } from "@/server/observability/logger";
import { moderationService } from "@/server/wiring";
import { flagSchema } from "@/features/comments/server/schemas";

const logger = createLogger("api/comments/flag");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { userId, errorResponse } = await requireAuth();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const parsed = flagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().formErrors },
        { status: 400 },
      );
    }

    const comment = await moderationService.flag(id, parsed.data.reason, userId);
    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to flag comment";
    logger.error("[api/comments/flag] POST error:", { error });
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: errMsg.includes("not found") ? 404 : 500 },
    );
  }
}
