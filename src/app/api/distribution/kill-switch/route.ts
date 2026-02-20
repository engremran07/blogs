/**
 * /api/distribution/kill-switch — Global distribution kill switch
 * Enables/disables the entire distribution module site-wide.
 * Persists the `distributionEnabled` flag in SiteSettings via siteSettingsService
 * so the in-memory cache stays consistent with the DB.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { siteSettingsService } from "@/server/wiring";

const killSwitchSchema = z.object({
  enabled: z.boolean({ message: "'enabled' must be a boolean" }),
});

export async function GET() {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const settings = await siteSettingsService.getSettings();
    const enabled = settings.distributionEnabled ?? false;
    return NextResponse.json({
      success: true,
      data: { distributionEnabled: enabled },
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
    const { userId, errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const parsed = killSwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }
    const isEnabled = parsed.data.enabled;

    // Use siteSettingsService so the in-memory cache is updated atomically
    const result = await siteSettingsService.updateSettings(
      { distributionEnabled: isEnabled },
      userId,
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
