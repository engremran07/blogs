"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_ADMIN_BAR_SETTINGS,
  DEFAULT_SITE_NAME,
  type AdminBarSettings,
} from "./constants";

/* ── Re-export for external consumers ── */
export type { AdminBarSettings };

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

/* ── Detect environment (pure — evaluated once at module level) ── */

const ENV_LABEL: "LIVE" | "STAGING" | "DEV" = (() => {
  const env =
    process.env.NEXT_PUBLIC_VERCEL_ENV ??
    process.env.NEXT_PUBLIC_ENV ??
    process.env.NODE_ENV ??
    "development";
  if (env === "production") return "LIVE";
  if (env === "preview" || env === "staging") return "STAGING";
  return "DEV";
})();

/* ── Provider ── */

export function AdminBarProvider({ children }: { children: ReactNode }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [settings, setSettings] = useState<AdminBarSettings>(
    DEFAULT_ADMIN_BAR_SETTINGS,
  );
  const [siteName, setSiteName] = useState(DEFAULT_SITE_NAME);

  // Fetch admin bar + identity settings once
  useEffect(() => {
    fetch("/api/settings/admin-bar")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.success && res.data) {
          setSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {
        /* Settings fetch failed — use defaults silently */
      });

    fetch("/api/settings/public")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((res) => {
        if (res.success && res.data?.siteName) {
          setSiteName(res.data.siteName);
        }
      })
      .catch(() => {
        /* Public settings fetch failed — use defaults silently */
      });
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

  // Close dropdowns on Escape key
  useEffect(() => {
    if (!activeDropdown) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
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

  const value = useMemo(
    () => ({
      activeDropdown,
      openDropdown,
      closeDropdown,
      toggleDropdown,
      previewMode,
      enterPreview,
      exitPreview,
      settings,
      siteName,
      envLabel: ENV_LABEL,
    }),
    [
      activeDropdown,
      openDropdown,
      closeDropdown,
      toggleDropdown,
      previewMode,
      enterPreview,
      exitPreview,
      settings,
      siteName,
    ],
  );

  return <AdminBarCtx.Provider value={value}>{children}</AdminBarCtx.Provider>;
}

export function useAdminBar(): AdminBarContextValue {
  const ctx = useContext(AdminBarCtx);
  if (!ctx) throw new Error("useAdminBar must be used within AdminBarProvider");
  return ctx;
}
