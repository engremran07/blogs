/**
 * /api/ads/kill-switch — Global ads kill switch
 * GET  — Check current global kill switch status
 * POST — Instantly enables/disables all ads site-wide
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import { prisma } from "@/server/db/prisma";

const killSwitchBodySchema = z.object({
  killed: z.boolean(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const providers = await adsService.findAllProviders();
    const allKilled = providers.length > 0 && providers.every((p: any) => p.killSwitch);
    return NextResponse.json({
      success: true,
      data: { killed: allKilled, totalProviders: providers.length },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { killed } = killSwitchBodySchema.parse(body);
    await adsService.globalKillSwitch(killed);

    // Sync SiteSettings.adsEnabled so module-status API stays consistent
    const settings = await prisma.siteSettings.findFirst();
    if (settings) {
      await prisma.siteSettings.update({
        where: { id: settings.id },
        data: { adsEnabled: !killed } as any,
      });
    }

    return NextResponse.json({
      success: true,
      data: { adsEnabled: !killed, message: killed ? "All ads killed" : "Ads re-enabled" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
