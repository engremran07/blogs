/**
 * /api/distribution/records/[id] — Single distribution record operations
 * Supports: GET (detail), POST retry, DELETE cancel
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { distributionService } from "@/server/wiring";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const record = await distributionService.getDistributionById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** Retry a failed distribution */
export async function POST(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const record = await distributionService.retryDistribution({ recordId: id });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}

/** Cancel a scheduled/pending distribution */
export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const record = await distributionService.cancelDistribution({ recordId: id });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
