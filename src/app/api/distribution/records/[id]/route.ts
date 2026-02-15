/**
 * /api/distribution/records/[id] — Single distribution record operations
 * Supports: GET (detail), POST retry, DELETE cancel
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await distributionService.getDistributionById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

/** Retry a failed distribution */
export async function POST(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await distributionService.retryDistribution({ recordId: id });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}

/** Cancel a scheduled/pending distribution */
export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const record = await distributionService.cancelDistribution({ recordId: id });
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}
