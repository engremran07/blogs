/**
 * /api/ads/settings — Read / update ads configuration
 * Kill switch: admin-only mutation, reads always allowed for admins
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { adsAdminSettings } from "@/server/wiring";
import { updateAdsConfigSchema } from "@/features/ads/server/schemas";
import type { AdsConfig } from "@/features/ads/types";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const config = await adsAdminSettings.getConfig();
    return NextResponse.json({ success: true, data: config });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const input = updateAdsConfigSchema.parse(body);
    const config = await adsAdminSettings.updateConfig(input as Partial<AdsConfig>);
    return NextResponse.json({ success: true, data: config });
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
