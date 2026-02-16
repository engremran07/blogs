/**
 * InterstitialAd — Full-screen overlay ad with countdown timer.
 * Common in Google AdSense auto ads, PropellerAds, and mobile interstitials.
 *
 * Shows a full-screen overlay with the ad content. User must wait
 * for a countdown (default 5s) before the close button activates.
 * Respects frequency capping via sessionStorage.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface InterstitialAdProps {
  placement: AdPlacementData;
  /** Seconds before close button becomes active */
  countdownSeconds?: number;
  /** Session storage key for frequency capping */
  frequencyCapKey?: string;
  /** Max times to show per session */
  maxPerSession?: number;
  className?: string;
}

export function InterstitialAd({
  placement,
  countdownSeconds = 5,
  frequencyCapKey = "interstitial_shown",
  maxPerSession = 1,
  className = "",
}: InterstitialAdProps) {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    // Frequency capping check
    try {
      const shown = parseInt(sessionStorage.getItem(frequencyCapKey) || "0", 10);
      if (shown >= maxPerSession) return;
    } catch { /* SSR or storage unavailable */ }

    // Delay showing by 3 seconds after page load
    const showTimer = setTimeout(() => {
      setVisible(true);
      try {
        const shown = parseInt(sessionStorage.getItem(frequencyCapKey) || "0", 10);
        sessionStorage.setItem(frequencyCapKey, String(shown + 1));
      } catch { /* ignore */ }
    }, 3000);

    return () => clearTimeout(showTimer);
  }, [frequencyCapKey, maxPerSession]);

  useEffect(() => {
    if (!visible || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible, countdown]);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  // Lock body scroll when visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-sm ${className}`}
      data-ad-type="interstitial"
    >
      <div className="relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        {/* Close button or countdown */}
        <div className="absolute -top-3 -right-3">
          {canClose ? (
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700"
              aria-label="Close ad"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-xs font-bold text-white shadow-lg">
              {countdown}
            </div>
          )}
        </div>

        {/* Sponsored label */}
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
          Sponsored
        </p>

        {/* Ad content */}
        <AdRenderer placement={placement} />

        {/* Skip text */}
        {!canClose && (
          <p className="mt-3 text-center text-xs text-gray-400">
            You can close in {countdown} second{countdown !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
