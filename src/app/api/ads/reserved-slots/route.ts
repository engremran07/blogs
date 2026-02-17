/**
 * /api/ads/reserved-slots — Returns ad slots that have no active placement/provider,
 * so the public site can render "Reserved for Ads" placeholder blocks.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const pageType = req.nextUrl.searchParams.get("pageType");

    // Find active slots
    const where: Record<string, unknown> = { isActive: true };
    const slots = await (prisma as any).adSlot.findMany({
      where,
      include: {
        placements: {
          where: {
            isActive: true,
            provider: { isActive: true, killSwitch: false },
          },
          select: { id: true },
        },
        _count: { select: { placements: true } },
      },
    });

    // Filter to slots with no active placements
    const reserved = slots
      .filter((slot: any) => slot.placements.length === 0)
      .filter((slot: any) => {
        if (!pageType) return true;
        const types = (slot.pageTypes as string[]) ?? [];
        if (types.length === 0 || types.includes("*")) return true;
        return types.includes(pageType) || types.some((t: string) => {
          if (t.endsWith(":*")) {
            const prefix = t.replace(":*", ":");
            return pageType.startsWith(prefix);
          }
          return false;
        });
      })
      .map((slot: any) => ({
        id: slot.id,
        name: slot.name,
        position: slot.position,
        format: slot.format,
        pageTypes: slot.pageTypes,
      }));

    return NextResponse.json({ success: true, data: reserved });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
