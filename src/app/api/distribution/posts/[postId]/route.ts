/**
 * /api/distribution/posts/[postId] — Get distributions for a specific post
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";

type Params = { params: Promise<{ postId: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR", "AUTHOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { postId } = await ctx.params;
    const records = await distributionService.getPostDistributions(postId);
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
