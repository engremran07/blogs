/**
 * StickyAd — Sticks to top or bottom of the viewport.
 * Google AdSense "Anchor ads" equivalent.
 *
 * Props:
 *   position  – "top" | "bottom"
 *   closeable – Allow user to dismiss
 *   placement – The ad placement data to render
 */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface StickyAdProps {
  placement: AdPlacementData;
  position?: "top" | "bottom";
  closeable?: boolean;
  className?: string;
}

export function StickyAd({ placement, position = "bottom", closeable = true, className = "" }: StickyAdProps) {
  const [visible, setVisible] = useState(true);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const closeRef = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClose = useCallback(() => {
    closeRef.current = true;
    setVisible(false);
    // Track close event
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  if (!visible || !scrolledPastHero) return null;

  return (
    <div
      className={`fixed ${position === "top" ? "top-0" : "bottom-0"} left-0 right-0 z-9999 flex items-center justify-center bg-white/95 shadow-lg backdrop-blur-sm dark:bg-gray-900/95 ${className}`}
      data-ad-type="sticky"
      data-ad-position={position}
    >
      <div className="relative w-full max-w-4xl px-4 py-2">
        <AdRenderer placement={placement} />
        {closeable && (
          <button
            onClick={handleClose}
            className="absolute -top-2 right-2 rounded-full bg-gray-800 p-1 text-white shadow-md transition-colors hover:bg-gray-700 dark:bg-gray-600"
            aria-label="Close ad"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
