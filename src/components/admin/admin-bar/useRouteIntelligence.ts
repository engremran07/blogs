"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface RouteIntelligence {
  /** Whether the current page is the public home page */
  isHome: boolean;
  /** Whether the current page is a post/page editor */
  isEditor: boolean;
  /** Resource type being edited */
  resourceType: "post" | "page" | null;
  /** Resource identifier (postNumber or page slug/id) */
  resourceId: string | null;
  /** Human label for the current admin route */
  routeLabel: string;
  /** Whether we're viewing a public post (enables "Edit" link) */
  isViewingPost: boolean;
  /** Whether we're viewing a public page */
  isViewingPage: boolean;
  /** Whether we're on an admin route */
  isAdmin: boolean;
  /** Admin edit URL (when on a public post/page) */
  adminEditUrl: string | null;
  /** Public view URL (when on an admin editor) — needs slug from EditorContext */
  publicViewUrl: string | null;
  /** Back button target — parent page href */
  backHref: string | null;
  /** Back button label — e.g. "Posts", "Pages", "Dashboard" */
  backLabel: string | null;
  /** Detected slug from public URL (for /blog/[slug]) */
  publicSlug: string | null;
  /** Admin section identifier (e.g. "posts", "pages", "media") */
  adminSection: string | null;
  /** Is this a "new" form (new post, new page) */
  isNewEditor: boolean;
  /** Is this a list page (posts list, pages list, etc.) */
  isList: boolean;
}

const ADMIN_ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  posts: "Posts",
  pages: "Pages",
  media: "Media Library",
  comments: "Comments",
  users: "Users",
  seo: "SEO",
  ads: "Ads",
  distribution: "Distribution",
  cron: "Cron Tasks",
  settings: "Settings",
  categories: "Categories",
  tags: "Tags",
  menus: "Menus",
};

const ADMIN_BACK_TARGETS: Record<string, { href: string; label: string }> = {
  posts: { href: "/admin/posts", label: "Posts" },
  pages: { href: "/admin/pages", label: "Pages" },
  media: { href: "/admin", label: "Dashboard" },
  comments: { href: "/admin", label: "Dashboard" },
  users: { href: "/admin", label: "Dashboard" },
  seo: { href: "/admin", label: "Dashboard" },
  ads: { href: "/admin", label: "Dashboard" },
  distribution: { href: "/admin", label: "Dashboard" },
  cron: { href: "/admin", label: "Dashboard" },
  settings: { href: "/admin", label: "Dashboard" },
  categories: { href: "/admin/posts", label: "Blog" },
  tags: { href: "/admin/posts", label: "Blog" },
  menus: { href: "/admin/settings", label: "Settings" },
};

function capitalize(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useRouteIntelligence(): RouteIntelligence {
  const pathname = usePathname();

  return useMemo(() => {
    const isAdmin = pathname.startsWith("/admin");
    const base: RouteIntelligence = {
      isEditor: false,
      resourceType: null,
      resourceId: null,
      routeLabel: "Home",
      isHome: false,
      isViewingPost: false,
      isViewingPage: false,
      isAdmin,
      adminEditUrl: null,
      publicViewUrl: null,
      backHref: null,
      backLabel: null,
      publicSlug: null,
      adminSection: null,
      isNewEditor: false,
      isList: false,
    };

    // ── Admin: Post editor /admin/posts/[id]/edit ──
    const postEditMatch = pathname.match(/^\/admin\/posts\/([^/]+)\/edit$/);
    if (postEditMatch) {
      return {
        ...base,
        isEditor: true,
        resourceType: "post" as const,
        resourceId: postEditMatch[1],
        routeLabel: "Edit Post",
        isAdmin: true,
        backHref: "/admin/posts",
        backLabel: "Posts",
        adminSection: "posts",
      };
    }

    // ── Admin: Page editor /admin/pages/[id]/edit ──
    const pageEditMatch = pathname.match(/^\/admin\/pages\/([^/]+)\/edit$/);
    if (pageEditMatch) {
      return {
        ...base,
        isEditor: true,
        resourceType: "page" as const,
        resourceId: pageEditMatch[1],
        routeLabel: "Edit Page",
        isAdmin: true,
        backHref: "/admin/pages",
        backLabel: "Pages",
        adminSection: "pages",
      };
    }

    // ── Admin: New post ──
    if (pathname === "/admin/posts/new") {
      return {
        ...base,
        isEditor: true,
        resourceType: "post" as const,
        routeLabel: "New Post",
        isAdmin: true,
        isNewEditor: true,
        backHref: "/admin/posts",
        backLabel: "Posts",
        adminSection: "posts",
      };
    }

    // ── Admin: New page ──
    if (pathname === "/admin/pages/new") {
      return {
        ...base,
        isEditor: true,
        resourceType: "page" as const,
        routeLabel: "New Page",
        isAdmin: true,
        isNewEditor: true,
        backHref: "/admin/pages",
        backLabel: "Pages",
        adminSection: "pages",
      };
    }

    // ── Admin: non-editor pages ──
    if (isAdmin) {
      const segments = pathname
        .replace(/^\/admin\/?/, "")
        .split("/")
        .filter(Boolean);
      const section = segments[0] ?? "";
      const label = ADMIN_ROUTE_LABELS[section] ?? capitalize(section || "Dashboard");
      const back = section ? (ADMIN_BACK_TARGETS[section] ?? { href: "/admin", label: "Dashboard" }) : null;
      const isList = !!(section && segments.length === 1);

      return {
        ...base,
        routeLabel: label,
        isAdmin: true,
        adminSection: section || null,
        isList,
        backHref: back?.href ?? null,
        backLabel: back?.label ?? null,
      };
    }

    // ── Public: Home page ──
    if (pathname === "/" || pathname === "/home") {
      return {
        ...base,
        isHome: true,
        routeLabel: "Home",
      };
    }

    // ── Public: Blog post /blog/[slug] ──
    const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      return {
        ...base,
        routeLabel: "Blog Post",
        isViewingPost: true,
        publicSlug: blogMatch[1],
      };
    }

    // ── Public: Blog index ──
    if (pathname === "/blog" || pathname === "/posts") {
      return {
        ...base,
        routeLabel: "Blog",
        adminEditUrl: "/admin/posts",
      };
    }

    // ── Public: Category archive ──
    const catMatch = pathname.match(/^\/category\/([^/]+)$/);
    if (catMatch) {
      return {
        ...base,
        routeLabel: capitalize(catMatch[1]),
        publicSlug: catMatch[1],
        adminEditUrl: "/admin/categories",
      };
    }

    // ── Public: Tag archive ──
    const tagMatch = pathname.match(/^\/tag\/([^/]+)$/);
    if (tagMatch) {
      return {
        ...base,
        routeLabel: capitalize(tagMatch[1]),
        publicSlug: tagMatch[1],
      };
    }

    // ── Public: Search ──
    if (pathname === "/search") {
      return { ...base, routeLabel: "Search Results" };
    }

    // ── Public: Homepage ──
    if (pathname === "/") {
      return { ...base, routeLabel: "Home", isViewingPage: true };
    }

    // ── Public: Any other page (about, contact, privacy, etc.) ──
    const slug = pathname.split("/").filter(Boolean).pop() ?? "";
    return {
      ...base,
      routeLabel: capitalize(slug || "Page"),
      isViewingPage: true,
      publicSlug: slug || null,
    };
  }, [pathname]);
}
