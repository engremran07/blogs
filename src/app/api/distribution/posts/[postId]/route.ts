/**
 * /api/distribution/posts/[postId] — Get distributions for a specific post
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { distributionService, siteSettingsService } from "@/server/wiring";

type Params = { params: Promise<{ postId: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'author' });
    if (errorResponse) return errorResponse;

    const settings = await siteSettingsService.getSettings();
    if (!settings.distributionEnabled) {
      return NextResponse.json({ success: false, error: "Distribution module is disabled" }, { status: 403 });
    }

    const { postId } = await ctx.params;
    const records = await distributionService.getPostDistributions(postId);
    return NextResponse.json({ success: true, data: records });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
