/**
 * /api/distribution/kill-switch — Global distribution kill switch
 * Enables/disables the entire distribution module site-wide.
 * Persists the `distributionEnabled` flag in SiteSettings via siteSettingsService
 * so the in-memory cache stays consistent with the DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const settings = await siteSettingsService.getSettings();
    const enabled = settings.distributionEnabled ?? false;
    return NextResponse.json({ success: true, data: { distributionEnabled: enabled } });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { enabled } = await req.json();
    const isEnabled = enabled === true;

    // Use siteSettingsService so the in-memory cache is updated atomically
    const result = await siteSettingsService.updateSettings(
      { distributionEnabled: isEnabled },
      session.user.id ?? session.user.email ?? "admin",
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to update distribution setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        distributionEnabled: isEnabled,
        message: isEnabled ? "Distribution enabled" : "Distribution disabled",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
