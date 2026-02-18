/**
 * /api/ads/ads-txt — Generate ads.txt content
 * Returns plain text for serving as /ads.txt
 */
import { NextResponse } from "next/server";
import { adsService } from "@/server/wiring";

export async function GET() {
  try {
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
