/**
 * ReservedAdSlot — Public placeholder block for ad slots with no active provider.
 *
 * Usage:
 *   <ReservedAdSlot position="SIDEBAR" label="Ad Space" />
 *
 * When an ad provider is configured for this slot, this component should be
 * replaced by the actual ad render. Until then, it shows a clean placeholder.
 */
"use client";

import { Megaphone } from "lucide-react";

interface ReservedAdSlotProps {
  position?: string;
  label?: string;
  className?: string;
  /** Set to true to hide the placeholder entirely (e.g. when ads module is disabled) */
  hidden?: boolean;
}

export function ReservedAdSlot({
  position,
  label = "Ad Space",
  className = "",
  hidden = false,
}: ReservedAdSlotProps) {
  if (hidden) return null;

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
      role="complementary"
      aria-label="Reserved ad space"
    >
      <Megaphone className="mb-2 h-6 w-6 text-gray-300 dark:text-gray-600" />
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
        Reserved for Ads
      </p>
      {position && (
        <p className="mt-0.5 text-[10px] text-gray-300 dark:text-gray-600">
          {position} &middot; {label}
        </p>
      )}
    </div>
  );
}
