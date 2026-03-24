"use client";

import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { SiteNameDropdown } from "./SiteNameDropdown";
import type { RouteIntelligence } from "./useRouteIntelligence";

/**
 * Left zone of the AdminBar:
 *  - Mobile sidebar toggle (admin routes, small screens only)
 *  - Back button (admin pages except dashboard)
 *  - Site name dropdown with ENV badge
 *  - Editor label
 */
export function LeftZone({
  route,
}: {
  route: RouteIntelligence;
  pathname: string;
}) {
  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1">
      {/* Mobile sidebar toggle — only on admin routes, only on small screens */}
      {route.isAdmin && (
        <button type="button"
          onClick={() =>
            window.dispatchEvent(new Event("admin-sidebar-toggle"))
          }
          className="flex shrink-0 items-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Back button — shown on admin pages except dashboard */}
      {route.isAdmin && route.backHref && route.backLabel && (
        <Link
          href={route.backHref}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={`Back to ${route.backLabel}`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{route.backLabel}</span>
        </Link>
      )}

      {/* Site name dropdown */}
      <SiteNameDropdown />

      {/* In editor mode, show the route label (e.g. "Edit Post") */}
      {route.isEditor && (
        <span className="truncate px-1 text-sm font-medium text-white">
          {route.routeLabel}
        </span>
      )}
    </div>
  );
}
