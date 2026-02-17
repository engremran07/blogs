/**
 * /api/settings/module-status — Returns enabled/disabled state of killable modules.
 * Used by admin layout to hide or mark-red killed modules in the sidebar.
 */
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const settings = await siteSettingsService.getSettings();

    return NextResponse.json({
      success: true,
      data: {
        comments: settings.enableComments ?? true,
        ads: (settings as any).adsEnabled ?? false,
        distribution: (settings as any).distributionEnabled ?? false,
        captcha: settings.captchaProvider !== 'none',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
