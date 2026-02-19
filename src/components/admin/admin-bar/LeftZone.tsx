"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { SiteNameDropdown } from "./SiteNameDropdown";
import type { RouteIntelligence } from "./useRouteIntelligence";

/**
 * Left zone of the AdminBar:
 *  - Back button (admin pages except dashboard)
 *  - Site name dropdown with ENV badge
 *  - Breadcrumb trail
 */
export function LeftZone({
  route,
  pathname,
}: {
  route: RouteIntelligence;
  pathname: string;
}) {
  const { settings } = useAdminBar();

  // Build breadcrumbs from pathname
  const breadcrumbs = buildBreadcrumbs(pathname, route);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      {/* Back button — shown on admin pages except dashboard */}
      {route.isAdmin && route.backHref && route.backLabel && (
        <Link
          href={route.backHref}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{route.backLabel}</span>
        </Link>
      )}

      {/* Site name dropdown */}
      <SiteNameDropdown />

      {/* Separator */}
      {settings.adminBarShowBreadcrumbs && breadcrumbs.length > 0 && (
        <span className="text-gray-600">|</span>
      )}

      {/* Breadcrumbs — hidden in editor mode (too noisy) */}
      {settings.adminBarShowBreadcrumbs && !route.isEditor && (
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-0.5 overflow-hidden"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex shrink-0 items-center gap-0.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-gray-600" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="truncate rounded px-1 py-0.5 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="max-w-[200px] truncate px-1 py-0.5 text-sm font-medium text-white">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* In editor mode, show the route label (e.g. "Edit Post") */}
      {route.isEditor && (
        <span className="truncate px-1 text-sm font-medium text-white">
          {route.routeLabel}
        </span>
      )}
    </div>
  );
}

/* ── Breadcrumb builder ── */

interface Crumb {
  label: string;
  href?: string;
}

function buildBreadcrumbs(pathname: string, route: RouteIntelligence): Crumb[] {
  const items: Crumb[] = [];

  if (route.isAdmin) {
    items.push({ label: "Dashboard", href: "/admin" });
    const rest = pathname.replace(/^\/admin\/?/, "");
    if (rest) {
      const segments = rest.split("/").filter(Boolean);
      let path = "/admin";
      segments.forEach((seg, i) => {
        path += `/${seg}`;
        const isLast = i === segments.length - 1;
        const label = seg
          .replace(/-/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        items.push(isLast ? { label } : { label, href: path });
      });
    }
  } else {
    items.push({ label: "Home", href: "/" });
    const segments = pathname.split("/").filter(Boolean);
    let path = "";
    segments.forEach((seg, i) => {
      path += `/${seg}`;
      const isLast = i === segments.length - 1;
      const label = seg
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      items.push(isLast ? { label } : { label, href: path });
    });
  }

  return items;
}
