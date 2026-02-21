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

/** Raw DB placement with fields not on the client-facing AdPlacementData */
interface RawAdPlacement extends AdPlacementData {
  endDate?: string | Date | null;
  slot: AdPlacementData["slot"] & { pageTypes?: string[] };
}

/** Typed ad-related Prisma tables not on the default client type */
interface AdPrismaExt {
  adSettings: {
    findFirst(
      args: Record<string, unknown>,
    ): Promise<{
      positionKillSwitches?: unknown;
      requireConsent?: boolean;
    } | null>;
  };
  adPlacement: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
  };
  adSlot: {
    findMany(
      args: Record<string, unknown>,
    ): Promise<Array<{ name: string; position: string; pageTypes: string[] }>>;
  };
}

const adPrisma: AdPrismaExt = {
  adSettings: {
    findFirst: (args) => prisma.adSettings.findFirst(args as never),
  },
  adPlacement: {
    findMany: (args) => prisma.adPlacement.findMany(args as never),
  },
  adSlot: {
    findMany: (args) => prisma.adSlot.findMany(args as never),
  },
};

const adProviderPrisma = {
  count: (args: Record<string, unknown>) =>
    prisma.adProvider.count(args as never),
};

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

    // Global kill switch — hide EVERYTHING: no ads, no stubs, no placeholders
    if (!adsEnabled) {
      return null;
    }

    // Check per-position kill switch from AdSettings
    const adSettings = await adPrisma.adSettings.findFirst({
      select: { positionKillSwitches: true, requireConsent: true },
    });
    const posKillSwitches =
      (adSettings?.positionKillSwitches as Record<string, boolean>) ?? {};
    const requireConsent: boolean = adSettings?.requireConsent ?? false;
    if (posKillSwitches[position] === true) {
      if (!showPlaceholder) return null;
      return (
        <ReservedAdSlot
          position={position}
          label="Position disabled"
          className={className}
        />
      );
    }

    const now = new Date();

    // Fetch ALL active placements for this position, then filter by pageType
    // in JS to support prefix-wildcard patterns like "tag:*", "category:*"
    const placements = (await adPrisma.adPlacement.findMany({
      where: {
        isActive: true,
        provider: { isActive: true, killSwitch: false },
        slot: {
          isActive: true,
          position,
        },
        OR: [{ startDate: null }, { startDate: { lte: now } }],
      },
      include: {
        provider: {
          select: { name: true, type: true, scriptUrl: true, clientId: true },
        },
        slot: {
          select: {
            name: true,
            position: true,
            format: true,
            maxWidth: true,
            maxHeight: true,
            responsive: true,
            pageTypes: true,
          },
        },
      },
      orderBy: { slot: { renderPriority: "desc" } },
    })) as RawAdPlacement[];

    // Post-filter: pageType matching (exact, "*", empty, prefix-wildcard) + endDate
    let activePlacements: AdPlacementData[] = placements.filter(
      (p) =>
        slotMatchesPage(p.slot?.pageTypes ?? [], pageType) &&
        (!p.endDate || new Date(p.endDate as string) > now),
    );

    // Ad rotation: shuffle eligible placements so different ads show on each load
    for (let i = activePlacements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [activePlacements[i], activePlacements[j]] = [
        activePlacements[j],
        activePlacements[i],
      ];
    }
    activePlacements = activePlacements.slice(0, 3); // limit ads per position

    if (activePlacements.length === 0) {
      // Only show reserved placeholder when:
      //  1. showPlaceholder is enabled
      //  2. No real ad providers exist (Google Ads, Ezoic, MediaVine, etc.)
      // If real providers ARE configured, the slot is simply empty (no visual noise).
      if (showPlaceholder) {
        const realProviderCount = await adProviderPrisma.count({
          where: { isActive: true, killSwitch: false },
        });

        // Real providers exist — just render nothing (no placeholder noise)
        if (realProviderCount > 0) return null;

        // No providers at all — show placeholder so admin knows where to set up ads
        const allSlots = await adPrisma.adSlot.findMany({
          where: {
            isActive: true,
            position,
          },
          select: { name: true, position: true, pageTypes: true },
        });

        const reservedSlot = allSlots.find((s) =>
          slotMatchesPage(s.pageTypes ?? [], pageType),
        );

        if (reservedSlot) {
          return (
            <ReservedAdSlot
              position={position}
              label={reservedSlot.name}
              className={className}
            />
          );
        }
        return (
          <ReservedAdSlot
            position={position}
            label="Ads will display here"
            className={className}
          />
        );
      }
      return null;
    }

    // Real ads exist — render them
    return (
      <div
        className={`ad-slot-container ${className}`}
        data-position={position}
      >
        {activePlacements.map((p) => (
          <AdRenderer
            key={p.id}
            placement={p}
            requireConsent={requireConsent}
          />
        ))}
      </div>
    );
  } catch {
    // Silently fail — ads should never break the page
    return null;
  }
}
