/**
 * /api/distribution/health — Platform health check endpoint.
 * Returns circuit breaker and rate limiting status per platform.
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { distributionService, siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const settings = await siteSettingsService.getSettings();
    if (!settings.distributionEnabled) {
      return NextResponse.json({ success: false, error: "Distribution module is disabled" }, { status: 403 });
    }

    const health = await distributionService.healthCheck();
    return NextResponse.json({ success: true, data: health });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
