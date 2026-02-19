"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* ── Admin Bar settings shape (matches Prisma SiteSettings fields) ── */

export interface AdminBarSettings {
  adminBarEnabled: boolean;
  adminBarShowBreadcrumbs: boolean;
  adminBarShowNewButton: boolean;
  adminBarShowSeoScore: boolean;
  adminBarShowStatusToggle: boolean;
  adminBarShowWordCount: boolean;
  adminBarShowLastSaved: boolean;
  adminBarShowSaveButton: boolean;
  adminBarShowPublishButton: boolean;
  adminBarShowPreviewButton: boolean;
  adminBarShowViewSiteButton: boolean;
  adminBarShowSiteNameDropdown: boolean;
  adminBarShowUserDropdown: boolean;
  adminBarShowEnvBadge: boolean;
  adminBarBackgroundColor: string;
  adminBarAccentColor: string;
}

const DEFAULT_SETTINGS: AdminBarSettings = {
  adminBarEnabled: true,
  adminBarShowBreadcrumbs: true,
  adminBarShowNewButton: true,
  adminBarShowSeoScore: true,
  adminBarShowStatusToggle: true,
  adminBarShowWordCount: true,
  adminBarShowLastSaved: true,
  adminBarShowSaveButton: true,
  adminBarShowPublishButton: true,
  adminBarShowPreviewButton: true,
  adminBarShowViewSiteButton: true,
  adminBarShowSiteNameDropdown: true,
  adminBarShowUserDropdown: true,
  adminBarShowEnvBadge: true,
  adminBarBackgroundColor: "#0d0d18",
  adminBarAccentColor: "#6c63ff",
};

/* ── Context shape ── */

interface AdminBarContextValue {
  /** Which dropdown is currently open (null = none) */
  activeDropdown: string | null;
  /** Open a specific dropdown (closes all others) */
  openDropdown: (id: string) => void;
  /** Close all dropdowns */
  closeDropdown: () => void;
  /** Toggle a specific dropdown */
  toggleDropdown: (id: string) => void;
  /** Preview mode — hide admin bar to see the page as a visitor */
  previewMode: boolean;
  /** Enter preview mode */
  enterPreview: () => void;
  /** Exit preview mode */
  exitPreview: () => void;
  /** Admin bar settings from the database */
  settings: AdminBarSettings;
  /** Site identity (fetched once) */
  siteName: string;
  /** Current environment label */
  envLabel: "LIVE" | "STAGING" | "DEV";
}

const AdminBarCtx = createContext<AdminBarContextValue | null>(null);

/* ── Detect environment ── */

function detectEnv(): "LIVE" | "STAGING" | "DEV" {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NEXT_PUBLIC_ENV ??
    process.env.NODE_ENV ??
    "development";
  if (env === "production") return "LIVE";
  if (env === "preview" || env === "staging") return "STAGING";
  return "DEV";
}

/* ── Provider ── */

export function AdminBarProvider({ children }: { children: ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [settings, setSettings] = useState<AdminBarSettings>(DEFAULT_SETTINGS);
  const [siteName, setSiteName] = useState("MyBlog");

  const envLabel = detectEnv();

  // Fetch admin bar + identity settings once
  useEffect(() => {
    fetch("/api/settings/admin-bar")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});

    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.siteName) {
          setSiteName(res.data.siteName);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!activeDropdown) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-admin-bar-dropdown]")) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeDropdown]);

  const openDropdown = useCallback((id: string) => setActiveDropdown(id), []);
  const closeDropdown = useCallback(() => setActiveDropdown(null), []);
  const toggleDropdown = useCallback(
    (id: string) => setActiveDropdown((prev) => (prev === id ? null : id)),
    [],
  );
  const enterPreview = useCallback(() => {
    setPreviewMode(true);
    setActiveDropdown(null);
  }, []);
  const exitPreview = useCallback(() => setPreviewMode(false), []);

  return (
    <AdminBarCtx.Provider
      value={{
        activeDropdown,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        previewMode,
        enterPreview,
        exitPreview,
        settings,
        siteName,
        envLabel,
      }}
    >
      {children}
    </AdminBarCtx.Provider>
  );
}

export function useAdminBar(): AdminBarContextValue {
  const ctx = useContext(AdminBarCtx);
  if (!ctx) throw new Error("useAdminBar must be used within AdminBarProvider");
  return ctx;
}
