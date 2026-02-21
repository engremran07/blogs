"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Check,
  FileText,
  MessageSquare,
  Tag,
  Image as ImageIcon,
  Users,
  Settings,
  User,
  Pencil,
  BookOpen,
  Edit3,
  Shield,
  Crown,
} from "lucide-react";
import { RoleBadge } from "./RoleBadge";
import type { ReactNode } from "react";

// ─── Local types (client-safe mirror of server capabilities) ────────────────

type Capability = string;

interface CapabilityCategory {
  label: string;
  icon: string;
  color: string;
  capabilities: Capability[];
}

interface RoleMeta {
  label: string;
  description: string;
  color: string;
  icon: string;
  level: number;
}

// ─── Static data (mirrors server capabilities.ts) ───────────────────────────
// We duplicate here to keep this a pure client component with no server import

const ROLES_ORDERED = [
  "SUBSCRIBER",
  "CONTRIBUTOR",
  "AUTHOR",
  "EDITOR",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
] as const;

const ROLE_META: Record<string, RoleMeta> = {
  SUBSCRIBER: {
    label: "Subscriber",
    description: "Read content & manage profile",
    color: "gray",
    icon: "User",
    level: 0,
  },
  CONTRIBUTOR: {
    label: "Contributor",
    description: "Write draft posts, no publish",
    color: "yellow",
    icon: "Pencil",
    level: 1,
  },
  AUTHOR: {
    label: "Author",
    description: "Write & publish own posts",
    color: "green",
    icon: "BookOpen",
    level: 2,
  },
  EDITOR: {
    label: "Editor",
    description: "Edit all posts, tags & moderate",
    color: "blue",
    icon: "Edit3",
    level: 3,
  },
  ADMINISTRATOR: {
    label: "Administrator",
    description: "Full site management",
    color: "purple",
    icon: "Shield",
    level: 4,
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    description: "Unrestricted access",
    color: "red",
    icon: "Crown",
    level: 5,
  },
};

const CAPABILITY_CATEGORIES: CapabilityCategory[] = [
  {
    label: "Posts & Pages",
    icon: "FileText",
    color: "blue",
    capabilities: [
      "read_posts",
      "create_posts",
      "edit_own_posts",
      "delete_own_posts",
      "publish_posts",
      "edit_posts",
      "edit_others_posts",
      "delete_posts",
      "delete_others_posts",
      "manage_pages",
    ],
  },
  {
    label: "Comments",
    icon: "MessageSquare",
    color: "amber",
    capabilities: ["read_comments", "moderate_comments"],
  },
  {
    label: "Tags & Categories",
    icon: "Tag",
    color: "green",
    capabilities: ["manage_categories", "manage_tags"],
  },
  {
    label: "Media & Files",
    icon: "Image",
    color: "purple",
    capabilities: ["upload_files"],
  },
  {
    label: "Users",
    icon: "Users",
    color: "rose",
    capabilities: [
      "manage_users",
      "create_users",
      "edit_users",
      "delete_users",
    ],
  },
  {
    label: "Settings & Theme",
    icon: "Settings",
    color: "indigo",
    capabilities: ["manage_settings", "edit_theme", "install_plugins"],
  },
  {
    label: "Profile",
    icon: "User",
    color: "gray",
    capabilities: ["edit_profile"],
  },
];

// Role → capabilities (inherited/hierarchical)
const ROLE_CAPS: Record<string, Capability[]> = {
  SUBSCRIBER: ["read_posts", "read_comments", "edit_profile"],
  CONTRIBUTOR: [
    "read_posts",
    "read_comments",
    "edit_profile",
    "create_posts",
    "edit_own_posts",
    "delete_own_posts",
  ],
  AUTHOR: [
    "read_posts",
    "read_comments",
    "edit_profile",
    "create_posts",
    "edit_own_posts",
    "delete_own_posts",
    "publish_posts",
    "upload_files",
  ],
  EDITOR: [
    "read_posts",
    "read_comments",
    "edit_profile",
    "create_posts",
    "edit_own_posts",
    "delete_own_posts",
    "publish_posts",
    "upload_files",
    "edit_posts",
    "edit_others_posts",
    "delete_posts",
    "delete_others_posts",
    "manage_categories",
    "manage_tags",
    "moderate_comments",
  ],
  ADMINISTRATOR: [
    "read_posts",
    "read_comments",
    "edit_profile",
    "create_posts",
    "edit_own_posts",
    "delete_own_posts",
    "publish_posts",
    "upload_files",
    "edit_posts",
    "edit_others_posts",
    "delete_posts",
    "delete_others_posts",
    "manage_categories",
    "manage_tags",
    "moderate_comments",
    "manage_users",
    "create_users",
    "edit_users",
    "delete_users",
    "manage_settings",
    "manage_pages",
    "edit_theme",
    "install_plugins",
  ],
  SUPER_ADMIN: [], // All capabilities — shown as "All permissions"
};

// ─── Icon renderer ──────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ReactNode> = {
  FileText: <FileText className="h-3.5 w-3.5" />,
  MessageSquare: <MessageSquare className="h-3.5 w-3.5" />,
  Tag: <Tag className="h-3.5 w-3.5" />,
  Image: <ImageIcon className="h-3.5 w-3.5" />,
  Users: <Users className="h-3.5 w-3.5" />,
  Settings: <Settings className="h-3.5 w-3.5" />,
  User: <User className="h-3.5 w-3.5" />,
  Pencil: <Pencil className="h-3.5 w-3.5" />,
  BookOpen: <BookOpen className="h-3.5 w-3.5" />,
  Edit3: <Edit3 className="h-3.5 w-3.5" />,
  Shield: <Shield className="h-3.5 w-3.5" />,
  Crown: <Crown className="h-3.5 w-3.5" />,
};

const ROLE_ICON_MAP: Record<string, ReactNode> = {
  User: <User className="h-4 w-4" />,
  Pencil: <Pencil className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  Edit3: <Edit3 className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  Crown: <Crown className="h-4 w-4" />,
};

// ─── Capability label helper ────────────────────────────────────────────────

function capLabel(cap: string): string {
  return cap.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Color classes ──────────────────────────────────────────────────────────

function catColorClasses(color: string): {
  bg: string;
  text: string;
  badge: string;
  badgeActive: string;
} {
  const map: Record<
    string,
    { bg: string; text: string; badge: string; badgeActive: string }
  > = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      badgeActive:
        "bg-blue-200 text-blue-800 dark:bg-blue-800/60 dark:text-blue-200 ring-1 ring-blue-400/50",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      badgeActive:
        "bg-amber-200 text-amber-800 dark:bg-amber-800/60 dark:text-amber-200 ring-1 ring-amber-400/50",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-950/30",
      text: "text-green-600 dark:text-green-400",
      badge:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      badgeActive:
        "bg-green-200 text-green-800 dark:bg-green-800/60 dark:text-green-200 ring-1 ring-green-400/50",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      text: "text-purple-600 dark:text-purple-400",
      badge:
        "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      badgeActive:
        "bg-purple-200 text-purple-800 dark:bg-purple-800/60 dark:text-purple-200 ring-1 ring-purple-400/50",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      text: "text-rose-600 dark:text-rose-400",
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      badgeActive:
        "bg-rose-200 text-rose-800 dark:bg-rose-800/60 dark:text-rose-200 ring-1 ring-rose-400/50",
    },
    indigo: {
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      text: "text-indigo-600 dark:text-indigo-400",
      badge:
        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
      badgeActive:
        "bg-indigo-200 text-indigo-800 dark:bg-indigo-800/60 dark:text-indigo-200 ring-1 ring-indigo-400/50",
    },
    gray: {
      bg: "bg-gray-50 dark:bg-gray-900/30",
      text: "text-gray-600 dark:text-gray-400",
      badge: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
      badgeActive:
        "bg-gray-200 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300 ring-1 ring-gray-400/50",
    },
  };
  return map[color] ?? map.gray;
}

function roleColorClasses(color: string): {
  bg: string;
  border: string;
  text: string;
} {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    gray: {
      bg: "bg-gray-50 dark:bg-gray-800/40",
      border: "border-gray-200 dark:border-gray-700",
      text: "text-gray-600 dark:text-gray-300",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-950/30",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-300",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-300",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-200 dark:border-purple-800",
      text: "text-purple-700 dark:text-purple-300",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-300",
    },
  };
  return map[color] ?? map.gray;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface RolePickerProps {
  value: string;
  onChange: (role: string) => void;
  /** Label text above the picker */
  label?: string;
  /** Compact mode for table inline usage */
  compact?: boolean;
  className?: string;
}

export function RolePicker({
  value,
  onChange,
  label,
  compact = false,
  className = "",
}: RolePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const meta = ROLE_META[value] ?? ROLE_META.SUBSCRIBER;
  const caps = value === "SUPER_ADMIN" ? [] : (ROLE_CAPS[value] ?? []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between rounded-lg border transition-colors ${
          open
            ? "border-primary ring-2 ring-primary/20"
            : "border-gray-300 dark:border-gray-600"
        } bg-white px-3 py-2 text-left text-sm dark:bg-gray-800 ${compact ? "py-1.5" : ""}`}
      >
        <div className="flex items-center gap-2">
          <RoleBadge role={value} size={compact ? "sm" : "md"} />
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-85 max-h-105 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          {/* Role cards */}
          <div className="p-2 space-y-1">
            {ROLES_ORDERED.map((role) => {
              const rm = ROLE_META[role];
              const selected = value === role;
              const rc = roleColorClasses(rm.color);

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    onChange(role);
                    setOpen(false);
                  }}
                  className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    selected
                      ? `${rc.bg} ${rc.border} ring-1 ring-offset-0 ${rc.border}`
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/40"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      selected
                        ? `${rc.bg} ${rc.text}`
                        : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                    }`}
                  >
                    {ROLE_ICON_MAP[rm.icon] ?? <User className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${selected ? rc.text : "text-gray-800 dark:text-gray-200"}`}
                      >
                        {rm.label}
                      </span>
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        Lv {rm.level}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {rm.description}
                    </p>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Capability badges for selected role */}
          <div className="border-t border-gray-200 p-3 dark:border-gray-700">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {value === "SUPER_ADMIN"
                ? "All Permissions Granted"
                : `${meta.label} Permissions (${caps.length})`}
            </p>

            {value === "SUPER_ADMIN" ? (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                <Crown className="h-3.5 w-3.5" />
                <span>Full unrestricted access to all capabilities</span>
              </div>
            ) : (
              <div className="space-y-2">
                {CAPABILITY_CATEGORIES.filter((cat) =>
                  cat.capabilities.some((c) => caps.includes(c)),
                ).map((cat) => {
                  const cc = catColorClasses(cat.color);
                  const active = cat.capabilities.filter((c) =>
                    caps.includes(c),
                  );

                  return (
                    <div key={cat.label} className={`rounded-lg ${cc.bg} p-2`}>
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className={cc.text}>{ICON_MAP[cat.icon]}</span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider ${cc.text}`}
                        >
                          {cat.label}
                        </span>
                        <span className="ml-auto rounded-full bg-white/60 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                          {active.length}/{cat.capabilities.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {cat.capabilities.map((cap) => {
                          const has = caps.includes(cap);
                          return (
                            <span
                              key={cap}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                has ? cc.badgeActive : `${cc.badge} opacity-30`
                              }`}
                            >
                              {has && <Check className="h-2.5 w-2.5" />}
                              {capLabel(cap)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
