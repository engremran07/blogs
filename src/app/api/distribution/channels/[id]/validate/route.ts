/**
 * /api/distribution/channels/[id]/validate — Validate channel credentials
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { distributionService } from "@/server/wiring";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const result = await distributionService.validateChannelCredentials(id);
    return NextResponse.json({
      success: true,
      data: { valid: result.valid, error: result.error, message: result.valid ? "Credentials are valid" : "Credentials validation failed" },
    });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
