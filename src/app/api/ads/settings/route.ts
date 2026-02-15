/**
 * /api/ads/settings — Read / update ads configuration
 * Kill switch: admin-only mutation, reads always allowed for admins
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsAdminSettings } from "@/server/wiring";
import { updateAdsConfigSchema } from "@/features/ads/server/schemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const config = await adsAdminSettings.getConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = updateAdsConfigSchema.parse(body);
    const config = await adsAdminSettings.updateConfig(input as any);
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}
