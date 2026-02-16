/**
 * AdRenderer — Client component that renders an ad placement.
 *
 * Supports:
 *  - customHtml (raw HTML from placement)
 *  - adCode (provider-specific embed code, e.g. AdSense snippet)
 *  - Impression tracking via /api/ads/events
 *  - Click tracking
 *  - Responsive sizing (respects slot maxWidth / maxHeight)
 *  - Responsive breakpoint visibility
 *  - Ad refresh interval
 *  - Closeable ads
 *  - Lazy‐load via IntersectionObserver
 */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { X } from "lucide-react";
import { useCookieConsent } from "@/components/layout/CookieConsentBanner";

export interface AdPlacementData {
  id: string;
  adCode: string | null;
  customHtml: string | null;
  closeable?: boolean;
  refreshIntervalSec?: number;
  visibleBreakpoints?: string[];
  slot: {
    name: string;
    position: string;
    format: string;
    maxWidth: number | null;
    maxHeight: number | null;
    responsive: boolean;
  };
  provider: {
    name: string;
    type: string;
    scriptUrl: string | null;
    clientId: string | null;
  };
}

interface AdRendererProps {
  placement: AdPlacementData;
  className?: string;
  /** When true, loads ad immediately instead of waiting for viewport */
  eager?: boolean;
  /** When true, ads require marketing cookie consent before rendering */
  requireConsent?: boolean;
}

export function AdRenderer({ placement, className = "", eager = false, requireConsent = false }: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);
  const scriptInjected = useRef(false);
  const [closed, setClosed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { consented, categories } = useCookieConsent();

  // If consent is required but not given, show a placeholder
  if (requireConsent && (!consented || !categories.marketing)) {
    return (
      <div
        className={`ad-container flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
        role="complementary"
        aria-label="Ad placeholder — consent required"
      >
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">Advertisement</p>
          <p className="mt-1 text-[10px] text-gray-300 dark:text-gray-600">
            Enable marketing cookies to view this ad
          </p>
        </div>
      </div>
    );
  }

  // ── Track event ────────────────────────────────────────────────────
  const trackEvent = useCallback(
    (eventType: string) => {
      try {
        navigator.sendBeacon(
          "/api/ads/events",
          JSON.stringify({ placementId: placement.id, eventType }),
        );
      } catch {
        // silently fail — non-critical
      }
    },
    [placement.id],
  );

  // ── Impression tracking via IntersectionObserver ───────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || impressionTracked.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          impressionTracked.current = true;
          trackEvent("IMPRESSION");
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );

    if (eager) {
      impressionTracked.current = true;
      trackEvent("IMPRESSION");
    } else {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [eager, trackEvent]);

  // ── Inject external provider scripts (e.g. AdSense) ───────────────
  useEffect(() => {
    if (scriptInjected.current) return;
    const scriptUrl = placement.provider.scriptUrl;
    if (!scriptUrl) return;

    // Check if already loaded globally
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      scriptInjected.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    if (placement.provider.type === "ADSENSE" && placement.provider.clientId) {
      script.setAttribute("data-ad-client", placement.provider.clientId);
      script.crossOrigin = "anonymous";
    }
    document.head.appendChild(script);
    scriptInjected.current = true;
  }, [placement.provider]);

  // ── Ad refresh ─────────────────────────────────────────────────────
  useEffect(() => {
    const interval = placement.refreshIntervalSec;
    if (!interval || interval <= 0) return;
    const timer = setInterval(() => {
      impressionTracked.current = false;
      setRefreshKey((k) => k + 1);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [placement.refreshIntervalSec]);

  // ── Close handler ──────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setClosed(true);
    trackEvent("CLOSE");
  }, [trackEvent]);

  if (closed) return null;

  // ── Render content ─────────────────────────────────────────────────
  const html = placement.customHtml || placement.adCode || "";

  const style: React.CSSProperties = {};
  if (placement.slot.maxWidth) style.maxWidth = placement.slot.maxWidth;
  if (placement.slot.maxHeight) style.maxHeight = placement.slot.maxHeight;
  if (placement.slot.responsive) style.width = "100%";

  // Responsive breakpoint visibility classes
  const breakpoints = placement.visibleBreakpoints;
  let breakpointClass = "";
  if (breakpoints && breakpoints.length > 0) {
    const bpSet = new Set(breakpoints);
    const parts: string[] = [];
    if (!bpSet.has("MOBILE")) parts.push("max-sm:hidden");
    if (!bpSet.has("TABLET")) parts.push("max-lg:hidden sm:block");
    if (!bpSet.has("DESKTOP")) parts.push("lg:hidden");
    if (!bpSet.has("WIDESCREEN")) parts.push("2xl:hidden");
    breakpointClass = parts.join(" ");
  }

  return (
    <div
      ref={containerRef}
      key={refreshKey}
      className={`ad-container relative overflow-hidden ${breakpointClass} ${className}`}
      style={style}
      onClick={() => trackEvent("CLICK")}
      role="complementary"
      aria-label={`Advertisement — ${placement.slot.name}`}
      data-ad-position={placement.slot.position}
      data-ad-provider={placement.provider.type}
      data-ad-format={placement.slot.format}
    >
      {/* Close button for closeable ads */}
      {placement.closeable && (
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          aria-label="Close ad"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400 dark:bg-gray-800/50 dark:text-gray-500">
          Ad — {placement.slot.position}
        </div>
      )}

      {/* Sponsored label */}
      <div className="mt-0.5 text-right">
        <span className="text-[10px] font-medium text-gray-400">Ad</span>
      </div>
    </div>
  );
}
