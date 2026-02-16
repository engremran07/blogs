/**
 * GlobalAdSlots — Renders page-level ad positions that exist outside
 * individual page content: header banner, footer banner, sticky ads,
 * interstitial, exit-intent, floating, and vignette.
 *
 * Placed once in the root layout or PublicShell to provide site-wide
 * ad coverage. Each position checks for active placements via DB.
 *
 * Server component that conditionally renders client-side wrappers
 * for overlay/interactive ad types.
 */
import { prisma } from "@/server/db/prisma";
import type { AdPlacementData } from "./AdRenderer";
import { AdRenderer } from "./AdRenderer";
import { ReservedAdSlot } from "./ReservedAdSlot";
import { GlobalOverlayAds } from "./GlobalOverlayAds";

interface GlobalAdSlotsProps {
  /** Current page type for targeting */
  pageType?: string;
}

/**
 * Fetch placements for a specific position.
 */
async function fetchPositionPlacements(position: string, pageType: string): Promise<AdPlacementData[]> {
  try {
    const now = new Date();
    const placements = await (prisma as any).adPlacement.findMany({
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
            name: true, position: true, format: true,
            maxWidth: true, maxHeight: true, responsive: true,
            pageTypes: true,
          },
        },
      },
      take: 3,
    });

    return placements.filter(
      (p: any) => !p.endDate || new Date(p.endDate) > now,
    );
  } catch {
    return [];
  }
}

export async function GlobalAdSlots({ pageType = "global" }: GlobalAdSlotsProps) {
  // Check if ads are enabled
  const siteSettings = await prisma.siteSettings.findFirst({
    select: { adsEnabled: true },
  });
  if (!siteSettings?.adsEnabled) return null;

  // Check if consent is required
  const adSettings = await (prisma as any).adSettings.findFirst({
    select: { requireConsent: true },
  });
  const requireConsent: boolean = adSettings?.requireConsent ?? false;

  // Fetch overlay ad placements in parallel
  const [
    headerAds,
    footerAds,
    stickyBottomAds,
    interstitialAds,
    exitIntentAds,
    floatingAds,
  ] = await Promise.all([
    fetchPositionPlacements("HEADER", pageType),
    fetchPositionPlacements("FOOTER", pageType),
    fetchPositionPlacements("STICKY_BOTTOM", pageType),
    fetchPositionPlacements("INTERSTITIAL", pageType),
    fetchPositionPlacements("EXIT_INTENT", pageType),
    fetchPositionPlacements("FLOATING", pageType),
  ]);

  return (
    <>
      {/* Header Banner Ad */}
      {headerAds.length > 0 && (
        <div className="w-full bg-gray-50 dark:bg-gray-900/50" data-ad-position="header">
          <div className="mx-auto max-w-7xl px-4">
            <AdRenderer placement={headerAds[0]} requireConsent={requireConsent} />
          </div>
        </div>
      )}

      {/* Footer Banner Ad (rendered before footer) */}
      {footerAds.length > 0 && (
        <div className="w-full border-t border-gray-200 bg-gray-50 py-2 dark:border-gray-800 dark:bg-gray-900/50" data-ad-position="footer">
          <div className="mx-auto max-w-7xl px-4">
            <AdRenderer placement={footerAds[0]} requireConsent={requireConsent} />
          </div>
        </div>
      )}

      {/* Overlay ad types — rendered via client component */}
      <GlobalOverlayAds
        stickyPlacement={stickyBottomAds[0] || null}
        interstitialPlacement={interstitialAds[0] || null}
        exitIntentPlacement={exitIntentAds[0] || null}
        floatingPlacement={floatingAds[0] || null}
        requireConsent={requireConsent}
      />
    </>
  );
}
