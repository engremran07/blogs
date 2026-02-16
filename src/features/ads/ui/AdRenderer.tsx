/**
 * AdRenderer — Client component that renders an ad placement.
 *
 * Supports:
 *  - customHtml (raw HTML from placement)
 *  - adCode (provider-specific embed code, e.g. AdSense snippet)
 *  - Impression tracking via /api/ads/events
 *  - Click tracking
 *  - Responsive sizing (respects slot maxWidth / maxHeight)
 *  - Lazy‐load via IntersectionObserver
 */
"use client";

import { useEffect, useRef, useCallback } from "react";

export interface AdPlacementData {
  id: string;
  adCode: string | null;
  customHtml: string | null;
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
}

export function AdRenderer({ placement, className = "", eager = false }: AdRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const impressionTracked = useRef(false);
  const scriptInjected = useRef(false);

  // ── Track event ────────────────────────────────────────────────────
  const trackEvent = useCallback(
    (eventType: "IMPRESSION" | "CLICK" | "VIEWABLE") => {
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

  // ── Render content ─────────────────────────────────────────────────
  const html = placement.customHtml || placement.adCode || "";

  const style: React.CSSProperties = {};
  if (placement.slot.maxWidth) style.maxWidth = placement.slot.maxWidth;
  if (placement.slot.maxHeight) style.maxHeight = placement.slot.maxHeight;
  if (placement.slot.responsive) style.width = "100%";

  return (
    <div
      ref={containerRef}
      className={`ad-container overflow-hidden ${className}`}
      style={style}
      onClick={() => trackEvent("CLICK")}
      role="complementary"
      aria-label={`Advertisement — ${placement.slot.name}`}
      data-ad-position={placement.slot.position}
      data-ad-provider={placement.provider.type}
    >
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="flex h-24 items-center justify-center rounded-lg bg-gray-50 text-xs text-gray-400 dark:bg-gray-800/50 dark:text-gray-500">
          Ad — {placement.slot.position}
        </div>
      )}
    </div>
  );
}
