/**
 * AdContainer — Server component that fetches active ad placements for a
 * given position + pageType from the database and renders them.
 *
 * Behaviour matrix:
 *   adsEnabled=false             → nothing (entire ads module is off)
 *   adsEnabled=true + position kill switch on → stub placeholder
 *   adsEnabled=true + provider kill switch on → stub placeholder
 *   adsEnabled=true + no active placements    → stub placeholder
 *   adsEnabled=true + active placements       → real ads
 *
 * The stub placeholder lets admins see where ads will appear before
 * providers are connected. When the global kill switch (adsEnabled=false)
 * is engaged, even stubs disappear.
 *
 * Usage:
 *   <AdContainer position="SIDEBAR" pageType="blog" />
 *   <AdContainer position="IN_CONTENT" pageType="page:about" />
 *   <AdContainer position="BETWEEN_POSTS" pageType="blog-index" />
 */
import { prisma } from "@/server/db/prisma";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";
import { ReservedAdSlot } from "./ReservedAdSlot";

interface AdContainerProps {
  /** Ad position — e.g. SIDEBAR, IN_CONTENT, HEADER, FOOTER */
  position: string;
  /** Page type key — e.g. "blog", "home", "page:about", "category:tech" */
  pageType: string;
  /** Additional CSS class */
  className?: string;
  /** Show reserved placeholder when no ad exists (default: true) */
  showPlaceholder?: boolean;
}

export async function AdContainer({
  position,
  pageType,
  className = "",
  showPlaceholder = true,
}: AdContainerProps) {
  try {
    // Check if ads module is enabled globally
    const siteSettings = await prisma.siteSettings.findFirst({
      select: { adsEnabled: true },
    });

    // adsEnabled=false → nothing at all (no stubs, no ads)
    if (siteSettings && !siteSettings.adsEnabled) {
      return null;
    }

    // Check per-position kill switch from AdSettings
    const adSettings = await (prisma as any).adSettings.findFirst({
      select: { positionKillSwitches: true },
    });
    const posKillSwitches = (adSettings?.positionKillSwitches as Record<string, boolean>) ?? {};
    if (posKillSwitches[position] === true) {
      // Position is killed — show stub so admin knows it's there but disabled
      return <ReservedAdSlot position={position} label="Position disabled" className={className} />;
    }

    const now = new Date();

    // Find active placements matching position + pageType
    const placements = await (prisma as any).adPlacement.findMany({
      where: {
        isActive: true,
        provider: { isActive: true, killSwitch: false },
        slot: {
          isActive: true,
          position,
          OR: [
            { pageTypes: { isEmpty: true } },
            { pageTypes: { has: pageType } },
            { pageTypes: { has: "*" } },
          ],
        },
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
      },
      include: {
        provider: {
          select: { name: true, type: true, scriptUrl: true, clientId: true },
        },
        slot: {
          select: {
            name: true, position: true, format: true,
            maxWidth: true, maxHeight: true, responsive: true,
          },
        },
      },
      orderBy: { slot: { renderPriority: "desc" } },
      take: 3, // limit ads per position
    });

    // Also check endDate
    const activePlacements: AdPlacementData[] = placements.filter(
      (p: any) => !p.endDate || new Date(p.endDate) > now,
    );

    if (activePlacements.length === 0) {
      // No active placements — show stub placeholder so admin sees where ads go
      if (showPlaceholder) {
        const reservedSlot = await (prisma as any).adSlot.findFirst({
          where: {
            isActive: true,
            position,
            OR: [
              { pageTypes: { isEmpty: true } },
              { pageTypes: { has: pageType } },
              { pageTypes: { has: "*" } },
            ],
          },
          select: { name: true, position: true },
        });

        if (reservedSlot) {
          return <ReservedAdSlot position={position} label={reservedSlot.name} className={className} />;
        }
        // Even without a slot record, show a generic stub for the position
        return <ReservedAdSlot position={position} label="Ads will display here" className={className} />;
      }
      return null;
    }

    // Real ads exist — render them
    return (
      <div className={`ad-slot-container ${className}`} data-position={position}>
        {activePlacements.map((p) => (
          <AdRenderer key={p.id} placement={p} />
        ))}
      </div>
    );
  } catch {
    // Silently fail — ads should never break the page
    return null;
  }
}
