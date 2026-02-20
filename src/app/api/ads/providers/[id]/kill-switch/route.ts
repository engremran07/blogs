/**
 * /api/ads/providers/[id]/kill-switch — Toggle provider kill switch
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";

type Params = { params: Promise<{ id: string }> };

const killSwitchBodySchema = z.object({
  killed: z.boolean(),
});

export async function POST(req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const body = await req.json();
    const { killed } = killSwitchBodySchema.parse(body);
    const provider = await adsService.toggleProviderKillSwitch(id, killed);
    return NextResponse.json({ success: true, data: provider });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
