/**
 * /api/distribution/kill-switch — Global distribution kill switch
 * Enables/disables the entire distribution module site-wide.
 * Persists the `distributionEnabled` flag in SiteSettings.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { prisma } from "@/server/db/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const settings = await prisma.siteSettings.findFirst();
    const enabled = (settings as any)?.distributionEnabled ?? false;
    return NextResponse.json({ success: true, data: { distributionEnabled: enabled } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
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

    const { enabled } = await req.json();
    const isEnabled = enabled === true;

    let settings = await prisma.siteSettings.findFirst();
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: { distributionEnabled: isEnabled } as any,
      });
    } else {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: { distributionEnabled: isEnabled } as any,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        distributionEnabled: isEnabled,
        message: isEnabled ? "Distribution enabled" : "Distribution disabled",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}
