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

/**
 * Match a slot's pageTypes array against a concrete pageType string.
 *
 * Supports:
 *   - exact match:  pageTypes includes "blog" → matches "blog"
 *   - universal:    pageTypes includes "*"    → matches everything
 *   - empty array:  []                         → matches everything
 *   - prefix-wildcard: pageTypes includes "tag:*" → matches "tag:tech", "tag:react" etc.
 */
function slotMatchesPage(slotPageTypes: string[], pageType: string): boolean {
  if (!slotPageTypes || slotPageTypes.length === 0) return true;
  return slotPageTypes.some((t) => {
    if (t === "*") return true;
    if (t === pageType) return true;
    // Prefix-wildcard: "tag:*" matches any "tag:…" value
    if (t.endsWith(":*") && pageType.startsWith(t.slice(0, -1))) return true;
    return false;
  });
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
    const adsEnabled = siteSettings?.adsEnabled ?? false;

    // Check per-position kill switch from AdSettings
    const adSettings = await (prisma as any).adSettings.findFirst({
      select: { positionKillSwitches: true, requireConsent: true },
    });
    const posKillSwitches = (adSettings?.positionKillSwitches as Record<string, boolean>) ?? {};
    const requireConsent: boolean = adSettings?.requireConsent ?? false;
    if (posKillSwitches[position] === true) {
      if (!showPlaceholder) return null;
      return <ReservedAdSlot position={position} label="Position disabled" className={className} />;
    }

    if (!adsEnabled) {
      return null;
    }

    const now = new Date();

    // Fetch ALL active placements for this position, then filter by pageType
    // in JS to support prefix-wildcard patterns like "tag:*", "category:*"
    const placements = await (prisma as any).adPlacement.findMany({
      where: {
        isActive: true,
        provider: { isActive: true, killSwitch: false },
        slot: {
          isActive: true,
          position,
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
            pageTypes: true,
          },
        },
      },
      orderBy: { slot: { renderPriority: "desc" } },
    });

    // Post-filter: pageType matching (exact, "*", empty, prefix-wildcard) + endDate
    let activePlacements: AdPlacementData[] = placements.filter(
      (p: any) =>
        slotMatchesPage(p.slot?.pageTypes ?? [], pageType) &&
        (!p.endDate || new Date(p.endDate) > now),
    );

    // Ad rotation: shuffle eligible placements so different ads show on each load
    for (let i = activePlacements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activePlacements[i], activePlacements[j]] = [activePlacements[j], activePlacements[i]];
    }
    activePlacements = activePlacements.slice(0, 3); // limit ads per position

    if (activePlacements.length === 0) {
      // No active placements — show stub placeholder so admin sees where ads go
      if (showPlaceholder) {
        const allSlots = await (prisma as any).adSlot.findMany({
          where: {
            isActive: true,
            position,
          },
          select: { name: true, position: true, pageTypes: true },
        });

        const reservedSlot = allSlots.find((s: any) =>
          slotMatchesPage(s.pageTypes ?? [], pageType),
        );

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
          <AdRenderer key={p.id} placement={p} requireConsent={requireConsent} />
        ))}
      </div>
    );
  } catch {
    // Silently fail — ads should never break the page
    return null;
  }
}
