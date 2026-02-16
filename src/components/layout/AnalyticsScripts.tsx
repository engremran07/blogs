"use client";

import Script from "next/script";
import { useCookieConsent } from "./CookieConsentBanner";

interface AnalyticsScriptsProps {
  /** Google Analytics 4 measurement ID (G-XXXXXXXXXX) */
  gaId: string | null;
  /** When true, analytics require explicit cookie consent before loading */
  gdprEnabled: boolean;
}

/**
 * Conditionally injects analytics scripts based on cookie consent status.
 *
 * - If GDPR mode is OFF, scripts load immediately (simple consent banner is informational only).
 * - If GDPR mode is ON, scripts are deferred until the visitor accepts analytics cookies.
 *
 * Uses Next.js `<Script>` component for optimal loading (afterInteractive strategy).
 */
export function AnalyticsScripts({ gaId, gdprEnabled }: AnalyticsScriptsProps) {
  const { consented, categories } = useCookieConsent();

  // No tracking ID configured — nothing to inject
  if (!gaId) return null;

  // GDPR mode: block until user explicitly opts in to analytics
  if (gdprEnabled && (!consented || !categories.analytics)) return null;

  return (
    <>
      {/* Google Analytics 4 */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}
