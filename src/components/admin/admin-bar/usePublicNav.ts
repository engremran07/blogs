"use client";

import { useState, useEffect, useMemo } from "react";

interface MenuData {
  id: string;
  name: string;
  slot: string;
  enabled: boolean;
  items: {
    id: string;
    label: string;
    url: string;
    target: string;
    visible: boolean;
  }[];
}

export interface PublicNavData {
  siteName: string;
  logoUrl: string | null;
  navLinks: { href: string; label: string; target?: string }[];
}

const DEFAULT_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Fetches public settings (nav links, logo, site name) for the AdminBar
 * to render site navigation on public pages.
 * Only fetches when `enabled` is true (i.e., on public routes).
 */
export function usePublicNav(enabled: boolean): PublicNavData | null {
  const [data, setData] = useState<{
    siteName: string;
    logoUrl: string | null;
    menuStructure: MenuData[] | null;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then(
        (res: {
          success: boolean;
          data?: {
            siteName?: string;
            logoUrl?: string;
            menuStructure?: MenuData[];
          };
        }) => {
          if (res.success && res.data) {
            setData({
              siteName: res.data.siteName || "MyBlog",
              logoUrl: res.data.logoUrl || null,
              menuStructure: res.data.menuStructure || null,
            });
          }
        },
      )
      .catch(() => {});
  }, [enabled]);

  return useMemo(() => {
    if (!enabled || !data) return null;

    const menus = data.menuStructure;
    let navLinks: { href: string; label: string; target?: string }[];

    if (Array.isArray(menus)) {
      const headerMenu = menus.find((m) => m.slot === "header" && m.enabled);
      if (headerMenu) {
        navLinks = headerMenu.items
          .filter((item) => item.visible)
          .map((item) => ({
            href: item.url,
            label: item.label,
            target: item.target,
          }));
      } else {
        navLinks = DEFAULT_NAV_LINKS;
      }
    } else {
      navLinks = DEFAULT_NAV_LINKS;
    }

    return {
      siteName: data.siteName,
      logoUrl: data.logoUrl,
      navLinks,
    };
  }, [enabled, data]);
}
