/**
 * /api/distribution/records — Query distribution records with pagination
 * Kill switch: distributionEnabled in SiteSettings
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService, siteSettingsService } from "@/server/wiring";
import { queryDistributionsSchema } from "@/features/distribution/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const settings = await siteSettingsService.getSettings();
    if (!settings.distributionEnabled) {
      return NextResponse.json({ success: false, error: "Distribution module is disabled" }, { status: 403 });
    }

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const query = queryDistributionsSchema.parse(params);
    const result = await distributionService.getDistributions(query);
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
