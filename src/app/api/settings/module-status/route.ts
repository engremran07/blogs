/**
 * /api/settings/module-status — Returns enabled/disabled state of killable modules.
 * Used by admin layout to hide or mark-red killed modules in the sidebar.
 *
 * Always invalidates the settings cache before reading to ensure we return
 * the true DB state (kill switches may have been toggled by other endpoints).
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    // Force fresh DB read — kill switches write from separate endpoints
    siteSettingsService.invalidateCache();
    const settings = await siteSettingsService.getSettings();

    return NextResponse.json({
      success: true,
      data: {
        comments: settings.enableComments ?? true,
        ads: settings.adsEnabled ?? true,
        distribution: settings.distributionEnabled ?? false,
        captcha: settings.captchaEnabled ?? false,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
