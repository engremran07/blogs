/**
 * /api/ads/slots/[id] — Single slot CRUD
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import { updateSlotSchema } from "@/features/ads/server/schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const slot = await adsService.findSlotById(id);
    if (!slot) {
      return NextResponse.json(
        { success: false, error: { code: "SLOT_NOT_FOUND", message: "Slot not found" } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: slot });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json();
    const input = updateSlotSchema.parse(body);
    const slot = await adsService.updateSlot(id, input);
    return NextResponse.json({ success: true, data: slot });
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

export async function DELETE(_req: NextRequest, ctx: Params) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    await adsService.deleteSlot(id);
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
