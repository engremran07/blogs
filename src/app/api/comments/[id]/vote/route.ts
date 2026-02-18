import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { createLogger } from "@/server/observability/logger";
import { commentService } from "@/server/wiring";
import { voteSchema } from "@/features/comments/server/schemas";

const logger = createLogger("api/comments/vote");

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to vote" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.flatten().formErrors },
        { status: 400 },
      );
    }

    const comment = await commentService.vote(id, {
      type: parsed.data.type,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, data: comment });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Failed to vote";
    const status = errMsg.includes("disabled") ? 403
      : errMsg.includes("Already voted") ? 409
      : 500;
    logger.error("[api/comments/vote] POST error:", { error });
    return NextResponse.json({ success: false, error: errMsg }, { status });
  }
}
