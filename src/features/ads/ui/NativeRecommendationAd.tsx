/**
 * NativeRecommendationAd — Content recommendation widget.
 * Emulates Outbrain, Taboola, and Google Matched Content style.
 *
 * Renders ad content inside a "Recommended" or "Sponsored" card grid
 * that visually matches the site's content cards.
 */
"use client";

import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface NativeRecommendationAdProps {
  placement: AdPlacementData;
  label?: string;
  className?: string;
}

export function NativeRecommendationAd({
  placement,
  label = "Sponsored Content",
  className = "",
}: NativeRecommendationAdProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 ${className}`}
      data-ad-type="native-recommendation"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          Ad
        </span>
      </div>
      <AdRenderer placement={placement} />
    </div>
  );
}
