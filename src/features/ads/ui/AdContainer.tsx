/**
 * AdContainer — Server component that fetches active ad placements for a
 * given position + pageType from the database and renders them.
 *
 * If no active placement exists for the slot, it renders a ReservedAdSlot
 * placeholder. If the ads module is disabled globally, it renders nothing.
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
  /** Show reserved placeholder when no ad exists */
  showPlaceholder?: boolean;
}

export async function AdContainer({
  position,
  pageType,
  className = "",
  showPlaceholder = false,
}: AdContainerProps) {
  try {
    // Check if ads module is enabled
    const siteSettings = await prisma.siteSettings.findFirst({
      select: { adsEnabled: true },
    });
    if (siteSettings && !siteSettings.adsEnabled) {
      return null;
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
      // Check if there's a reserved slot (active slot but no active placement)
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
      }
      return null;
    }

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
