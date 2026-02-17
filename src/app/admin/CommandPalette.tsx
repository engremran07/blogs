"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  FileText,
  File,
  MessageSquare,
  Tag,
  Users,
  Settings,
  PenSquare,
  Image,
  FolderTree,
  Megaphone,
  Share2,
  Clock,
  Navigation,
  BarChart3,
  ExternalLink,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string[];
  section: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (path: string) => {
      onClose();
      router.push(path);
    },
    [router, onClose],
  );

  const commands: Command[] = useMemo(
    () => [
      // Quick actions
      { id: "new-post", label: "Create New Post", icon: PenSquare, action: () => navigate("/admin/posts/new"), keywords: ["write", "article", "blog", "create"], section: "Quick Actions" },
      { id: "new-page", label: "Create New Page", icon: File, action: () => navigate("/admin/pages/new"), keywords: ["create", "static"], section: "Quick Actions" },
      { id: "view-site", label: "View Site", icon: ExternalLink, action: () => { onClose(); window.open("/", "_blank"); }, keywords: ["preview", "frontend", "public"], section: "Quick Actions" },
      { id: "sign-out", label: "Sign Out", icon: LogOut, action: () => { onClose(); signOut({ callbackUrl: "/login" }); }, keywords: ["logout", "exit"], section: "Quick Actions" },

      // Navigation
      { id: "nav-dashboard", label: "Dashboard", icon: LayoutDashboard, action: () => navigate("/admin"), keywords: ["home", "overview", "stats"], section: "Navigation" },
      { id: "nav-posts", label: "Posts", icon: FileText, action: () => navigate("/admin/posts"), keywords: ["articles", "blog"], section: "Navigation" },
      { id: "nav-pages", label: "Pages", icon: File, action: () => navigate("/admin/pages"), keywords: ["static"], section: "Navigation" },
      { id: "nav-media", label: "Media Library", icon: Image, action: () => navigate("/admin/media"), keywords: ["images", "files", "uploads"], section: "Navigation" },
      { id: "nav-categories", label: "Categories", icon: FolderTree, action: () => navigate("/admin/categories"), keywords: ["organize", "taxonomy"], section: "Navigation" },
      { id: "nav-tags", label: "Tags", icon: Tag, action: () => navigate("/admin/tags"), keywords: ["labels"], section: "Navigation" },
      { id: "nav-comments", label: "Comments", icon: MessageSquare, action: () => navigate("/admin/comments"), keywords: ["replies", "feedback"], section: "Navigation" },
      { id: "nav-users", label: "Users", icon: Users, action: () => navigate("/admin/users"), keywords: ["accounts", "members", "authors"], section: "Navigation" },
      { id: "nav-seo", label: "SEO", icon: BarChart3, action: () => navigate("/admin/seo"), keywords: ["search engine", "meta", "optimization"], section: "Navigation" },
      { id: "nav-ads", label: "Ads", icon: Megaphone, action: () => navigate("/admin/ads"), keywords: ["advertising", "monetization", "revenue"], section: "Navigation" },
      { id: "nav-distribution", label: "Distribution", icon: Share2, action: () => navigate("/admin/distribution"), keywords: ["social", "publish", "channels"], section: "Navigation" },
      { id: "nav-menus", label: "Menus", icon: Navigation, action: () => navigate("/admin/menus"), keywords: ["navigation", "links"], section: "Navigation" },
      { id: "nav-cron", label: "Cron Tasks", icon: Clock, action: () => navigate("/admin/cron"), keywords: ["scheduled", "jobs", "automation"], section: "Navigation" },
      { id: "nav-settings", label: "Settings", icon: Settings, action: () => navigate("/admin/settings"), keywords: ["config", "preferences"], section: "Navigation" },
    ],
    [navigate, onClose],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q)),
    );
  }, [query, commands]);

  // Group by section
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const group = map.get(cmd.section) || [];
      group.push(cmd);
      map.set(cmd.section, group);
    }
    return map;
  }, [filtered]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keep active index in bounds
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1));
  }, [filtered.length, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % Math.max(1, filtered.length));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + filtered.length) % Math.max(1, filtered.length));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[activeIndex]) {
            filtered[activeIndex].action();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, activeIndex, onClose],
  );

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="h-12 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none dark:text-white"
          />
          <kbd className="hidden rounded border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:border-gray-600 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
          {Array.from(grouped.entries()).map(([section, cmds]) => (
            <div key={section}>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {section}
              </div>
              {cmds.map((cmd) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      idx === activeIndex
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                    }`}
                  >
                    <cmd.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {idx === activeIndex && <ArrowRight className="h-3.5 w-3.5 text-gray-400" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 dark:border-gray-700">
          <div className="flex gap-2 text-[10px] text-gray-400">
            <span><kbd className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">↑↓</kbd> navigate</span>
            <span><kbd className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">↵</kbd> select</span>
          </div>
          <span className="text-[10px] text-gray-400">
            <kbd className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">Ctrl</kbd>+<kbd className="rounded border border-gray-300 px-1 py-0.5 dark:border-gray-600">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
