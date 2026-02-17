/**
 * /api/ads/overview — Aggregate ad stats overview
 * Kill switch: adsEnabled in SiteSettings
 */
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const stats = await adsService.getOverviewStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
