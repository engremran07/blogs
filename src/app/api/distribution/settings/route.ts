/**
 * /api/distribution/settings — Read / update distribution configuration
 * Kill switch: admin-only
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireAuth } from "@/server/api-auth";
import { distributionService, siteSettingsService } from "@/server/wiring";
import { updateDistributionSettingsSchema } from "@/features/distribution/server/schemas";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    // Return current config (safe subset)
    const settings = await siteSettingsService.getSettings();
    if (!settings.distributionEnabled) {
      return NextResponse.json({ success: false, error: "Distribution module is disabled" }, { status: 403 });
    }
    const stats = await distributionService.getStats();
    return NextResponse.json({ success: true, data: stats });
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
    const input = updateDistributionSettingsSchema.parse(body);
    await distributionService.updateConfig(input);
    return NextResponse.json({ success: true, data: { message: "Distribution settings updated" } });
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
