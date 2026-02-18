/**
 * /api/ads/ads-txt — Generate ads.txt content
 * Returns plain text for serving as /ads.txt
 */
import { NextResponse } from "next/server";
import { adsService, siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    // Global ads kill switch — return empty ads.txt when ads disabled
    const settings = await siteSettingsService.getSettings();
    if (!settings.adsEnabled) {
      return new NextResponse("", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const content = await adsService.generateAdsTxt();
    return new NextResponse(content, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
