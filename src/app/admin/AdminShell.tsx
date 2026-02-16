"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { clsx } from "clsx";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  FileText,
  File,
  MessageSquare,
  Tag,
  Users,
  Settings,
  Search,
  ChevronLeft,
  Menu,
  ExternalLink,
  PenSquare,
  Navigation,
  BarChart3,
  LogOut,
  User,
  Mail,
  Shield,
  ChevronDown,
  Image,
  FolderTree,
  Megaphone,
  Share2,
  Clock,
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
    href: "/admin/posts", label: "Posts", icon: FileText,
    children: [
      { href: "/admin/categories", label: "Categories", icon: FolderTree },
    ],
  },
  { href: "/admin/pages", label: "Pages", icon: File },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare, moduleKey: "comments" },
  { href: "/admin/tags", label: "Tags", icon: Tag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/seo", label: "SEO", icon: BarChart3 },
  { href: "/admin/ads", label: "Ads", icon: Megaphone, moduleKey: "ads" },
  { href: "/admin/distribution", label: "Distribution", icon: Share2, moduleKey: "distribution" },
  { href: "/admin/menus", label: "Menus", icon: Navigation },
  { href: "/admin/cron", label: "Cron Tasks", icon: Clock },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [userInfo, setUserInfo] = useState<Record<string, string | null> | null>(null);
  const [moduleStatus, setModuleStatus] = useState<ModuleStatus>({ comments: true, ads: false, distribution: false, captcha: false });
  const profileRef = useRef<HTMLDivElement>(null);

  // Auto-expand parent menus if a child is active
  useEffect(() => {
    const expanded = new Set<string>();
    for (const link of sidebarLinks) {
      if (link.children?.some((c) => pathname.startsWith(c.href))) {
        expanded.add(link.href);
      }
    }
    if (expanded.size > 0) setExpandedMenus((prev) => new Set([...prev, ...expanded]));
  }, [pathname]);

  // Fetch full user info for the profile dropdown
  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/users?id=${(session.user as any).id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setUserInfo(data.data);
          }
        })
        .catch(() => {});
    }
  }, [session?.user?.id]);

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

  useEffect(() => { refreshModuleStatus(); }, [refreshModuleStatus]);

  // Listen for real-time module status changes from child pages
  useEffect(() => {
    function onModuleChange(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setModuleStatus((prev) => ({ ...prev, ...detail }));
      }
    }
    window.addEventListener("module-status-changed", onModuleChange);
    return () => window.removeEventListener("module-status-changed", onModuleChange);
  }, []);

  // Click-outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Session is guaranteed by the server layout — show loading state briefly
  // while client-side session hydrates
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const role = (session.user as { role?: string })?.role;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
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
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                B
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:block"
          >
            <ChevronLeft
              className={clsx("h-5 w-5 transition-transform", collapsed && "rotate-180")}
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
              const childActive = hasChildren && link.children!.some((c) => pathname.startsWith(c.href));
              const isModuleKilled = link.moduleKey ? !moduleStatus[link.moduleKey as keyof ModuleStatus] : false;

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
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      )}
                      title={collapsed ? `${link.label}${isModuleKilled ? " (disabled)" : ""}` : undefined}
                    >
                      <link.icon className={clsx("h-5 w-5 shrink-0", isModuleKilled && "text-red-400 dark:text-red-500")} />
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
                        <ChevronDown className={clsx("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
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
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
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
        {/* Top Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <PenSquare className="h-4 w-4" />
            <span className="hidden sm:inline">New Post</span>
          </Link>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {(session.user?.name || session.user?.email || "A")[0].toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-tight">
                  {session.user?.name || session.user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  {(session.user as any)?.role?.replace("_", " ") || "User"}
                </p>
              </div>
              <ChevronDown className={clsx("h-4 w-4 text-gray-400 transition-transform hidden sm:block", profileOpen && "rotate-180")} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {/* User Header */}
                <div className="border-b border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {(session.user?.name || session.user?.email || "A")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {userInfo?.displayName || userInfo?.firstName ? `${userInfo.firstName || ""} ${userInfo.lastName || ""}`.trim() : session.user?.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{(session.user as any)?.username || session.user?.email?.split("@")[0]}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {(session.user as any)?.role?.replace("_", " ") || "User"}
                    </span>
                  </div>
                </div>

                {/* User Details */}
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{session.user?.email}</span>
                  </div>
                  {userInfo?.jobTitle && (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      <Shield className="h-4 w-4 shrink-0" />
                      <span className="truncate">{userInfo.jobTitle}{userInfo.company ? ` at ${userInfo.company}` : ""}</span>
                    </div>
                  )}
                  {userInfo?.bio && (
                    <p className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {userInfo.bio}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                  <Link
                    href="/admin/users"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <User className="h-4 w-4" />
                    Manage Users
                  </Link>
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
