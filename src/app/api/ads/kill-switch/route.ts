/**
 * /api/ads/kill-switch — Global ads kill switch
 * GET  — Check current global kill switch status (reads SiteSettings.adsEnabled)
 * POST — Instantly enables/disables all ads site-wide
 *
 * Uses siteSettingsService so the in-memory cache stays consistent.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService, siteSettingsService } from "@/server/wiring";

const killSwitchBodySchema = z.object({
  killed: z.boolean(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Single source of truth: SiteSettings.adsEnabled (not per-provider killSwitch)
    const settings = await siteSettingsService.getSettings();
    const adsEnabled = settings.adsEnabled ?? false;
    return NextResponse.json({
      success: true,
      data: { killed: !adsEnabled, adsEnabled },
    });
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

    const body = await req.json();
    const { killed } = killSwitchBodySchema.parse(body);

    // Kill all providers at the provider level too
    await adsService.globalKillSwitch(killed);

    // Update SiteSettings.adsEnabled via service so cache stays in sync
    const result = await siteSettingsService.updateSettings(
      { adsEnabled: !killed },
      session.user.id ?? session.user.email ?? "admin",
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Failed to update ads setting" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { adsEnabled: !killed, message: killed ? "All ads killed" : "Ads re-enabled" },
    });
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
