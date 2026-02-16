/**
 * FloatingAd — Corner floating ad with close button.
 * Appears in a corner of the viewport after scrolling.
 * Common in direct-sold campaigns and PropellerAds.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

type Corner = "bottom-right" | "bottom-left" | "top-right" | "top-left";

interface FloatingAdProps {
  placement: AdPlacementData;
  corner?: Corner;
  /** Delay in ms before showing */
  showDelay?: number;
  closeable?: boolean;
  className?: string;
}

const cornerClasses: Record<Corner, string> = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
};

export function FloatingAd({
  placement,
  corner = "bottom-right",
  showDelay = 5000,
  closeable = true,
  className = "",
}: FloatingAdProps) {
  const [visible, setVisible] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true);
      // Trigger entrance animation
      requestAnimationFrame(() => setAnimateIn(true));
    }, showDelay);
    return () => clearTimeout(timer);
  }, [showDelay]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => setVisible(false), 300);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  if (!visible) return null;

  return (
    <div
      className={`fixed ${cornerClasses[corner]} z-50 w-72 rounded-xl border border-gray-200 bg-white shadow-2xl transition-all duration-300 dark:border-gray-700 dark:bg-gray-800 ${
        animateIn ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
      data-ad-type="floating"
      data-ad-corner={corner}
    >
      {closeable && (
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white shadow-md transition-colors hover:bg-gray-700"
          aria-label="Close ad"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <div className="overflow-hidden rounded-xl">
        <AdRenderer placement={placement} />
      </div>
      <p className="px-3 py-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-gray-400">
        Ad
      </p>
    </div>
  );
}
