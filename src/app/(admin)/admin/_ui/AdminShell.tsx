"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { clsx } from "clsx";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  FileText,
  File,
  MessageSquare,
  Tag,
  Users,
  Settings,
  ChevronLeft,
  Menu,
  ExternalLink,
  Navigation,
  BarChart3,
  ChevronDown,
  Image,
  FolderTree,
  Megaphone,
  Share2,
  Clock,
  Home,
  ChevronRight,
} from "lucide-react";

interface SidebarLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  children?: SidebarLink[];
  /** Module key — if set, link is styled red / hidden when module is disabled */
  moduleKey?: string;
}

interface ModuleStatus {
  comments: boolean;
  ads: boolean;
  distribution: boolean;
  captcha: boolean;
}

const sidebarLinks: SidebarLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  {
    href: "/admin/posts",
    label: "Blog",
    icon: FileText,
    children: [
      { href: "/admin/posts", label: "Posts", icon: FileText, exact: true },
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
      { href: "/admin/tags", label: "Tags", icon: Tag },
    ],
  },
  { href: "/admin/pages", label: "Pages", icon: File },
  { href: "/admin/media", label: "Media", icon: Image },
  {
    href: "/admin/comments",
    label: "Comments",
    icon: MessageSquare,
    moduleKey: "comments",
  },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/seo", label: "SEO", icon: BarChart3 },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, moduleKey: "ads" },
  {
    href: "/admin/distribution",
    label: "Distribution",
    icon: Share2,
    moduleKey: "distribution",
  },
  { href: "/admin/cron", label: "Cron Tasks", icon: Clock },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings,
    children: [
      {
        href: "/admin/settings",
        label: "General",
        icon: Settings,
        exact: true,
      },
      { href: "/admin/menus", label: "Menus", icon: Navigation },
      { href: "/admin/settings/admin-bar", label: "Admin Bar", icon: Menu },
    ],
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({
    comments: true,
    ads: true,
    distribution: true,
    captcha: true,
  });

  // Auto-expand parent menus if a child is active
  useEffect(() => {
    const expanded = new Set<string>();
    for (const link of sidebarLinks) {
      if (link.children?.some((c) => pathname.startsWith(c.href))) {
        expanded.add(link.href);
      }
    }
    if (expanded.size > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responds to route change
      setExpandedMenus((prev) => new Set([...prev, ...expanded]));
    }
  }, [pathname]);

  // Fetch module enabled/disabled status for sidebar indicators
  const refreshModuleStatus = useCallback(() => {
    if (session?.user) {
      fetch("/api/settings/module-status")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setModuleStatus(data.data);
          }
        })
        .catch(() => {});
    }
  }, [session?.user]);

  useEffect(() => {
    refreshModuleStatus();
  }, [refreshModuleStatus]);

  // Listen for real-time module status changes from child pages
  useEffect(() => {
    function onModuleChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setModuleStatus((prev) => ({ ...prev, ...detail }));
      }
    }
    window.addEventListener("module-status-changed", onModuleChange);
    return () =>
      window.removeEventListener("module-status-changed", onModuleChange);
  }, []);

  // Listen for AdminBar sidebar toggle event (mobile)
  useEffect(() => {
    function onSidebarToggle() {
      setMobileOpen((prev) => !prev);
    }
    window.addEventListener("admin-sidebar-toggle", onSidebarToggle);
    return () =>
      window.removeEventListener("admin-sidebar-toggle", onSidebarToggle);
  }, []);

  // Session is guaranteed by the server layout — show loading state briefly
  // while client-side session hydrates
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 pt-11 dark:bg-gray-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white transition-all dark:border-gray-700 dark:bg-gray-800 lg:static",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
                B
              </div>
              <span className="font-bold text-gray-900 dark:text-white">
                Admin
              </span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:block"
          >
            <ChevronLeft
              className={clsx(
                "h-5 w-5 transition-transform",
                collapsed && "rotate-180",
              )}
            />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {sidebarLinks.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              const hasChildren = link.children && link.children.length > 0;
              const isExpanded = expandedMenus.has(link.href);
              const childActive =
                hasChildren &&
                link.children?.some((c) => pathname.startsWith(c.href));
              const isModuleKilled = link.moduleKey
                ? !moduleStatus[link.moduleKey as keyof ModuleStatus]
                : false;

              return (
                <div key={link.href}>
                  <div className="flex items-center">
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={clsx(
                        "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isModuleKilled
                          ? "text-red-400 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-900/20"
                          : active || childActive
                            ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                      )}
                      title={
                        collapsed
                          ? `${link.label}${isModuleKilled ? " (disabled)" : ""}`
                          : undefined
                      }
                    >
                      <link.icon
                        className={clsx(
                          "h-5 w-5 shrink-0",
                          isModuleKilled && "text-red-400 dark:text-red-500",
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 flex items-center gap-2">
                          {link.label}
                          {isModuleKilled && (
                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-600 dark:bg-red-900/40 dark:text-red-400">
                              OFF
                            </span>
                          )}
                        </span>
                      )}
                    </Link>
                    {hasChildren && !collapsed && (
                      <button
                        onClick={() => {
                          setExpandedMenus((prev) => {
                            const next = new Set(prev);
                            if (next.has(link.href)) next.delete(link.href);
                            else next.add(link.href);
                            return next;
                          });
                        }}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <ChevronDown
                          className={clsx(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && !collapsed && (
                    <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 pl-3 dark:border-gray-700">
                      {link.children!.map((child) => {
                        const cActive = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setMobileOpen(false)}
                            className={clsx(
                              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                              cActive
                                ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700",
                            )}
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 dark:border-gray-700">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ExternalLink className="h-5 w-5 shrink-0" />
            {!collapsed && <span>View Site</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Auto Breadcrumbs */}
          {pathname !== "/admin" &&
            (() => {
              const segments = pathname
                .replace(/^\/admin\/?/, "")
                .split("/")
                .filter(Boolean);
              const crumbs = segments.map((seg, idx) => ({
                label:
                  seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
                href: "/admin/" + segments.slice(0, idx + 1).join("/"),
              }));
              return (
                <nav aria-label="Admin breadcrumb" className="mb-4">
                  <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <li className="flex items-center gap-1.5">
                      <Link
                        href="/admin"
                        className="flex items-center gap-1 transition-colors hover:text-primary dark:hover:text-primary"
                      >
                        <Home className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </li>
                    {crumbs.map((crumb, idx) => (
                      <li key={idx} className="flex items-center gap-1.5">
                        <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        {idx === crumbs.length - 1 ? (
                          <span className="font-medium text-gray-900 dark:text-white max-w-50 truncate">
                            {crumb.label}
                          </span>
                        ) : (
                          <Link
                            href={crumb.href}
                            className="transition-colors hover:text-primary dark:hover:text-primary"
                          >
                            {crumb.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              );
            })()}
          {children}
        </main>
      </div>
    </div>
  );
}
