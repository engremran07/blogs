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

export function AdRenderer({
  placement,
  className = "",
  eager = false,
  requireConsent = false,
}: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);
  const scriptInjected = useRef(false);
  const viewableTracked = useRef(false);
  const lastClickTime = useRef(0);
  const [closed, setClosed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { consented, categories } = useCookieConsent();
  const consentBlocked =
    requireConsent && (!consented || !categories.marketing);

  // ── Track event ────────────────────────────────────────────────────
  const trackEvent = useCallback(
    (eventType: string) => {
      if (consentBlocked) return;
      try {
        navigator.sendBeacon(
          "/api/ads/events",
          JSON.stringify({ placementId: placement.id, eventType }),
        );
      } catch {
        // silently fail — non-critical
      }
    },
    [placement.id, consentBlocked],
  );

  // ── Impression tracking via IntersectionObserver ───────────────────
  useEffect(() => {
    if (consentBlocked) return;
    const el = containerRef.current;
    if (!el || impressionTracked.current) return;

    let viewableTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          if (!impressionTracked.current) {
            impressionTracked.current = true;
            trackEvent("IMPRESSION");
          }
          // IAB viewability: 50% visible for ≥1 second
          if (!viewableTracked.current) {
            viewableTimer = setTimeout(() => {
              viewableTracked.current = true;
              trackEvent("VIEWABLE");
            }, 1000);
          }
        } else {
          // Left viewport before 1s — cancel viewable timer
          if (viewableTimer) {
            clearTimeout(viewableTimer);
            viewableTimer = null;
          }
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

    return () => {
      observer.disconnect();
      if (viewableTimer) clearTimeout(viewableTimer);
    };
  }, [eager, trackEvent, consentBlocked]);

  // ── Inject external provider scripts (e.g. AdSense) ───────────────
  useEffect(() => {
    if (consentBlocked) return;
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
  }, [placement.provider, consentBlocked]);

  // ── Ad refresh ─────────────────────────────────────────────────────
  useEffect(() => {
    if (consentBlocked) return;
    const interval = placement.refreshIntervalSec;
    if (!interval || interval <= 0) return;
    const timer = setInterval(() => {
      impressionTracked.current = false;
      setRefreshKey((k) => k + 1);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [placement.refreshIntervalSec, consentBlocked]);

  // ── Close handler ──────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setClosed(true);
    trackEvent("CLOSE");
  }, [trackEvent]);

  // ── Click debounce — prevent rapid duplicate clicks on client side
  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTime.current < 5000) return; // 5s debounce
    lastClickTime.current = now;
    trackEvent("CLICK");
  }, [trackEvent]);

  // ── Consent gate — show placeholder if marketing cookies not accepted
  if (consentBlocked) {
    return (
      <div
        className={`ad-container flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
        role="complementary"
        aria-label="Ad placeholder — consent required"
      >
        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
            Advertisement
          </p>
          <p className="mt-1 text-[10px] text-gray-300 dark:text-gray-600">
            Enable marketing cookies to view this ad
          </p>
        </div>
      </div>
    );
  }

  if (closed) return null;

  // ── Render content ─────────────────────────────────────────────────
  const html = placement.customHtml || placement.adCode || "";

  const containerStyle: React.CSSProperties = {};
  if (placement.slot.maxWidth)
    containerStyle.maxWidth = placement.slot.maxWidth;
  if (placement.slot.responsive) containerStyle.width = "100%";

  // Inner content gets the height constraint — the outer container stays
  // overflow-visible so nothing is clipped at the edges.
  const contentStyle: React.CSSProperties = {};
  if (placement.slot.maxHeight)
    contentStyle.maxHeight = placement.slot.maxHeight;
  if (placement.slot.maxHeight) contentStyle.overflow = "hidden";

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
      className={`ad-container relative ${breakpointClass} ${className}`}
      style={containerStyle}
      onClick={handleClick}
      role="complementary"
      aria-label={`Advertisement — ${placement.slot.name}`}
      data-ad-position={placement.slot.position}
      data-ad-provider={placement.provider.type}
      data-ad-format={placement.slot.format}
    >
      {/* Close button for closeable ads */}
      {placement.closeable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="absolute top-1 right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
          aria-label="Close ad"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      <div style={contentStyle}>
        {html ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <div
            className="flex items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400 dark:bg-gray-800/50 dark:text-gray-500"
            style={{ height: placement.slot.maxHeight ?? 90 }}
          >
            Ad — {placement.slot.position}
          </div>
        )}
      </div>

      {/* Sponsored label */}
      <div className="mt-0.5 text-right">
        <span className="text-[10px] font-medium text-gray-400">Ad</span>
      </div>
    </div>
  );
}
