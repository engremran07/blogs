"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Menu, X } from "lucide-react";
import { clsx } from "clsx";
import { useAdminBar } from "./AdminBarProvider";
import { SiteNameDropdown } from "./SiteNameDropdown";
import { usePublicNav } from "./usePublicNav";
import type { RouteIntelligence } from "./useRouteIntelligence";

/**
 * Left zone of the AdminBar:
 *  - Mobile sidebar toggle (admin routes, small screens only)
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
  const publicNav = usePublicNav(!route.isAdmin);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isPublicPage = !route.isAdmin;

  // Build breadcrumbs from pathname
  const breadcrumbs = buildBreadcrumbs(pathname, route);

  return (
    <div className="relative flex min-w-0 flex-1 items-center gap-1">
      {/* Mobile sidebar toggle — only on admin routes, only on small screens */}
      {route.isAdmin && (
        <button
          onClick={() =>
            window.dispatchEvent(new Event("admin-sidebar-toggle"))
          }
          className="flex shrink-0 items-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
      )}

      {/* Mobile nav toggle — public pages only, small screens */}
      {isPublicPage && publicNav && (
        <button
          onClick={() => setMobileNavOpen((prev) => !prev)}
          className="flex shrink-0 items-center rounded p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white md:hidden"
          aria-label="Toggle site navigation"
        >
          {mobileNavOpen ? (
            <X className="h-4.5 w-4.5" />
          ) : (
            <Menu className="h-4.5 w-4.5" />
          )}
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

      {/* Logo — public pages only */}
      {isPublicPage && publicNav?.logoUrl && (
        <Link href="/" className="flex shrink-0 items-center">
          <Image
            src={publicNav.logoUrl}
            alt={publicNav.siteName}
            width={80}
            height={24}
            className="h-6 w-auto object-contain"
            unoptimized
          />
        </Link>
      )}

      {/* Site name dropdown */}
      <SiteNameDropdown />

      {/* ── Admin route: breadcrumbs ── */}
      {route.isAdmin &&
        settings.adminBarShowBreadcrumbs &&
        breadcrumbs.length > 0 && <span className="text-gray-600">|</span>}
      {route.isAdmin && settings.adminBarShowBreadcrumbs && !route.isEditor && (
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
                <span className="max-w-50 truncate px-1 py-0.5 text-sm font-medium text-white">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* ── Public page: site nav links (desktop) ── */}
      {isPublicPage && publicNav && (
        <>
          <span className="hidden text-gray-600 md:inline">|</span>
          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Site navigation"
          >
            {publicNav.navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "rounded px-2 py-1 text-sm transition-colors",
                  (
                    link.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(link.href)
                  )
                    ? "bg-white/15 font-medium text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      )}

      {/* In editor mode, show the route label (e.g. "Edit Post") */}
      {route.isEditor && (
        <span className="truncate px-1 text-sm font-medium text-white">
          {route.routeLabel}
        </span>
      )}

      {/* ── Public page: mobile nav dropdown ── */}
      {isPublicPage && mobileNavOpen && publicNav && (
        <div className="absolute left-0 top-full z-50 w-56 rounded-b-lg border border-t-0 border-white/10 bg-gray-900 p-1.5 shadow-xl md:hidden">
          {publicNav.navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileNavOpen(false)}
              className={clsx(
                "block rounded px-3 py-2 text-sm transition-colors",
                (
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href)
                )
                  ? "bg-white/15 font-medium text-white"
                  : "text-gray-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
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
