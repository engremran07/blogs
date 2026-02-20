/**
 * /api/ads/slots — CRUD for ad slots
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";
import {
  createSlotSchema,
  listQuerySchema,
} from "@/features/ads/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { activeOnly } = listQuerySchema.parse(params);
    const slots = await adsService.findAllSlots(activeOnly);
    return NextResponse.json({ success: true, data: slots });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const input = createSlotSchema.parse(body);
    const slot = await adsService.createSlot(input);
    return NextResponse.json({ success: true, data: slot }, { status: 201 });
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
