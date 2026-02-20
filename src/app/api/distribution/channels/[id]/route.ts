/**
 * /api/distribution/channels/[id] — Single channel CRUD + validation
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/api-auth";
import { distributionService } from "@/server/wiring";
import { updateChannelSchema } from "@/features/distribution/server/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const channel = await distributionService.getChannelById(id);
    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: channel });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    const body = await req.json();
    const input = updateChannelSchema.parse(body);
    const channel = await distributionService.updateChannel(id, input);
    return NextResponse.json({ success: true, data: channel });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map((i) => i.message).join(", ") },
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

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const { id } = await ctx.params;
    await distributionService.deleteChannel(id);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
