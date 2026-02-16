/**
 * GlobalOverlayAds — Client component that renders overlay ad types
 * (sticky, interstitial, exit-intent, floating).
 *
 * Receives serialized placement data from the server-side GlobalAdSlots
 * and renders the appropriate client-side ad components.
 */
"use client";

import type { AdPlacementData } from "./AdRenderer";
import { StickyAd } from "./StickyAd";
import { InterstitialAd } from "./InterstitialAd";
import { ExitIntentAd } from "./ExitIntentAd";
import { FloatingAd } from "./FloatingAd";
import { useCookieConsent } from "@/components/layout/CookieConsentBanner";

interface GlobalOverlayAdsProps {
  stickyPlacement: AdPlacementData | null;
  interstitialPlacement: AdPlacementData | null;
  exitIntentPlacement: AdPlacementData | null;
  floatingPlacement: AdPlacementData | null;
  requireConsent?: boolean;
}

export function GlobalOverlayAds({
  stickyPlacement,
  interstitialPlacement,
  exitIntentPlacement,
  floatingPlacement,
  requireConsent = false,
}: GlobalOverlayAdsProps) {
  const { consented, categories } = useCookieConsent();

  // If consent is required but not given, don't render overlay ads at all
  if (requireConsent && (!consented || !categories.marketing)) {
    return null;
  }

  return (
    <>
      {stickyPlacement && (
        <StickyAd
          placement={stickyPlacement}
          position="bottom"
          closeable
        />
      )}
      {interstitialPlacement && (
        <InterstitialAd
          placement={interstitialPlacement}
          countdownSeconds={5}
          maxPerSession={1}
        />
      )}
      {exitIntentPlacement && (
        <ExitIntentAd
          placement={exitIntentPlacement}
        />
      )}
      {floatingPlacement && (
        <FloatingAd
          placement={floatingPlacement}
          corner="bottom-right"
          showDelay={8000}
          closeable
        />
      )}
    </>
  );
}
