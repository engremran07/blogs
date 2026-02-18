/**
 * InFeedAdCard — An ad unit styled to blend with blog post cards.
 * Renders within the blog post grid/list/masonry layout matching
 * the surrounding card style.
 *
 * Server component — fetches ad placement data and renders within
 * the post listing layout. Returns null when ads are globally disabled.
 */
import { prisma } from "@/server/db/prisma";
import { AdContainer } from "./AdContainer";

interface InFeedAdCardProps {
  /** Layout type to match surrounding cards */
  layout: "grid" | "list" | "masonry";
  /** Page type for ad targeting */
  pageType: string;
  /** Index position in the feed */
  index?: number;
  className?: string;
}

export async function InFeedAdCard({
  layout,
  pageType,
  index = 0,
  className = "",
}: InFeedAdCardProps) {
  // Global kill switch — render nothing at all
  const siteSettings = await prisma.siteSettings.findFirst({
    select: { adsEnabled: true },
  });
  if (!siteSettings?.adsEnabled) return null;
  if (layout === "list") {
    return (
      <div
        className={`group relative overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50/50 transition-shadow dark:border-gray-700 dark:bg-gray-800/50 ${className}`}
        data-ad-feed-index={index}
      >
        <div className="flex flex-col sm:flex-row">
          <div className="flex w-full items-center justify-center p-4">
            <AdContainer
              position="IN_FEED"
              pageType={pageType}
              showPlaceholder
            />
          </div>
        </div>
      </div>
    );
  }

  // Grid & Masonry — card-shaped ad
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-50/50 transition-shadow dark:border-gray-700 dark:bg-gray-800/50 ${
        layout === "masonry" ? "break-inside-avoid" : ""
      } ${className}`}
      data-ad-feed-index={index}
    >
      <div className="flex min-h-50 items-center justify-center p-4">
        <AdContainer
          position="IN_FEED"
          pageType={pageType}
          showPlaceholder
        />
      </div>
    </div>
  );
}
