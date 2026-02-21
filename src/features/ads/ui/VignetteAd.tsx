/**
 * VignetteAd — Full-page ad shown between page navigations.
 * Google AdSense "Vignette" format equivalent.
 *
 * Renders as a full-screen overlay during route transitions.
 * Automatically dismisses after a timeout or on user interaction.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface VignetteAdProps {
  placement: AdPlacementData;
  /** Auto-dismiss after N seconds (0 = manual close only) */
  autoDismissSeconds?: number;
  className?: string;
}

export function VignetteAd({
  placement,
  autoDismissSeconds = 8,
  className = "",
}: VignetteAdProps) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (autoDismissSeconds <= 0) return;
    const interval = 50; // update every 50ms for smooth progress
    const totalSteps = (autoDismissSeconds * 1000) / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setProgress((step / totalSteps) * 100);
      if (step >= totalSteps) {
        clearInterval(timer);
        setVisible(false);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [autoDismissSeconds]);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  useEffect(() => {
    if (visible) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white dark:bg-gray-900 ${className}`}
      data-ad-type="vignette"
    >
      {/* Progress bar */}
      {autoDismissSeconds > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-primary transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        aria-label="Close ad"
      >
        <X className="h-4 w-4" />
        Skip
      </button>

      {/* Sponsored */}
      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-400">
        Sponsored
      </p>

      {/* Ad content */}
      <div className="w-full max-w-2xl px-4">
        <AdRenderer placement={placement} />
      </div>
    </div>
  );
}
