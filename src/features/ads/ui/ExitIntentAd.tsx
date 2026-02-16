/**
 * ExitIntentAd — Triggered when user intends to leave the page.
 * Detects mouse leaving the viewport (desktop) or back-button intent.
 * Popular with content recommendation ads (Outbrain/Taboola) and
 * direct-sold campaigns.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface ExitIntentAdProps {
  placement: AdPlacementData;
  /** Session storage key for frequency capping */
  frequencyCapKey?: string;
  className?: string;
}

export function ExitIntentAd({
  placement,
  frequencyCapKey = "exit_intent_shown",
  className = "",
}: ExitIntentAdProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Frequency check
    try {
      if (sessionStorage.getItem(frequencyCapKey)) return;
    } catch { /* ignore */ }

    let triggered = false;

    const handleMouseLeave = (e: MouseEvent) => {
      // Trigger when mouse leaves through the top of the viewport
      if (e.clientY <= 5 && !triggered) {
        triggered = true;
        setVisible(true);
        try { sessionStorage.setItem(frequencyCapKey, "1"); } catch { /* ignore */ }
      }
    };

    // Only listen on desktop (pointer-based devices)
    if (window.matchMedia("(pointer: fine)").matches) {
      document.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [frequencyCapKey]);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  // Lock body scroll
  useEffect(() => {
    if (visible) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center bg-black/70 backdrop-blur-sm ${className}`}
      onClick={handleClose}
      data-ad-type="exit-intent"
    >
      <div
        className="relative mx-4 w-full max-w-md animate-in fade-in zoom-in-95 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg transition-colors hover:bg-gray-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
          Before you go
        </p>

        <AdRenderer placement={placement} />
      </div>
    </div>
  );
}
