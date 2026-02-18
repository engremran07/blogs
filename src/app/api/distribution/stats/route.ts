/**
 * /api/distribution/stats — Distribution analytics overview
 * Kill switch: distributionEnabled in SiteSettings
 */
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService, siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

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
