/**
 * GlobalAdSlots — Server components for page-level ad positions that exist
 * outside individual page content: header banner, footer banner, sticky ads,
 * interstitial, exit-intent, floating, and vignette.
 *
 * Exports three named components (HeaderAdBanner, FooterAdBanner, OverlayAdSlots)
 * designed to be passed as React node props to PublicShell, which positions them
 * correctly in the layout and excludes them from admin routes.
 */
import { prisma } from "@/server/db/prisma";
import type { AdPlacementData } from "./AdRenderer";
import { AdRenderer } from "./AdRenderer";
import { GlobalOverlayAds } from "./GlobalOverlayAds";

/** Raw DB placement with endDate not on client-facing AdPlacementData */
interface RawGlobalPlacement extends AdPlacementData {
  endDate?: string | Date | null;
}

/** Typed ad-related Prisma tables not on the default client type */
interface AdPrismaExt {
  adSettings: {
    findFirst(
      args: Record<string, unknown>,
    ): Promise<{ requireConsent?: boolean } | null>;
  };
  adPlacement: {
    findMany(args: Record<string, unknown>): Promise<unknown[]>;
  };
}

const adPrisma: AdPrismaExt = {
  adSettings: {
    findFirst: (args) => prisma.adSettings.findFirst(args as never),
  },
  adPlacement: {
    findMany: (args) => prisma.adPlacement.findMany(args as never),
  },
};

interface SectionProps {
  /** Current page type for targeting */
  pageType?: string;
}

/**
 * Shared helper — check if ads are enabled and fetch consent setting.
 * Returns null if ads are disabled.
 */
async function getAdConfig() {
  try {
    const siteSettings = await prisma.siteSettings.findFirst({
      select: { adsEnabled: true },
    });
    if (!siteSettings?.adsEnabled) return null;

    const adSettings = await adPrisma.adSettings.findFirst({
      select: { requireConsent: true },
    });
    return { requireConsent: (adSettings?.requireConsent ?? false) as boolean };
  } catch {
    return null;
  }
}

/**
 * Fetch placements for a specific position.
 */
async function fetchPositionPlacements(
  position: string,
  _pageType: string,
): Promise<AdPlacementData[]> {
  try {
    const now = new Date();
    const placements = (await adPrisma.adPlacement.findMany({
      where: {
        isActive: true,
        provider: { isActive: true, killSwitch: false },
        slot: { isActive: true, position },
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
      take: 3,
    })) as RawGlobalPlacement[];

    return placements.filter(
      (p) => !p.endDate || new Date(p.endDate as string) > now,
    );
  } catch {
    return [];
  }
}

/* ─── Header Ad Banner ─────────────────────────────────────────────────────── */

export async function HeaderAdBanner({ pageType = "global" }: SectionProps) {
  const config = await getAdConfig();
  if (!config) return null;

  const headerAds = await fetchPositionPlacements("HEADER", pageType);
  if (headerAds.length === 0) return null;

  return (
    <div
      className="flex w-full items-center justify-center bg-gray-50 dark:bg-gray-900/50"
      data-ad-position="header"
    >
      <div className="w-full px-4">
        <AdRenderer
          placement={headerAds[0]}
          requireConsent={config.requireConsent}
        />
      </div>
    </div>
  );
}

/* ─── Footer Ad Banner ─────────────────────────────────────────────────────── */

export async function FooterAdBanner({ pageType = "global" }: SectionProps) {
  const config = await getAdConfig();
  if (!config) return null;

  const footerAds = await fetchPositionPlacements("FOOTER", pageType);
  if (footerAds.length === 0) return null;

  return (
    <div
      className="flex w-full items-center justify-center border-t border-gray-200 bg-gray-50 py-2 dark:border-gray-800 dark:bg-gray-900/50"
      data-ad-position="footer"
    >
      <div className="w-full px-4">
        <AdRenderer
          placement={footerAds[0]}
          requireConsent={config.requireConsent}
        />
      </div>
    </div>
  );
}

/* ─── Overlay Ad Slots (interstitial, exit-intent, floating, sticky) ──────── */

export async function OverlayAdSlots({ pageType = "global" }: SectionProps) {
  const config = await getAdConfig();
  if (!config) return null;

  const [stickyBottomAds, interstitialAds, exitIntentAds, floatingAds] =
    await Promise.all([
      fetchPositionPlacements("STICKY_BOTTOM", pageType),
      fetchPositionPlacements("INTERSTITIAL", pageType),
      fetchPositionPlacements("EXIT_INTENT", pageType),
      fetchPositionPlacements("FLOATING", pageType),
    ]);

  const hasAny =
    stickyBottomAds.length ||
    interstitialAds.length ||
    exitIntentAds.length ||
    floatingAds.length;
  if (!hasAny) return null;

  return (
    <GlobalOverlayAds
      stickyPlacement={stickyBottomAds[0] || null}
      interstitialPlacement={interstitialAds[0] || null}
      exitIntentPlacement={exitIntentAds[0] || null}
      floatingPlacement={floatingAds[0] || null}
      requireConsent={config.requireConsent}
    />
  );
}
