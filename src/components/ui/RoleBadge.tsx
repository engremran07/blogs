"use client";

import { User, Pencil, BookOpen, Edit3, Shield, Crown } from "lucide-react";
import type { ReactNode } from "react";

// ─── Role metadata (client-safe mirror of ROLE_META) ────────────────────────

interface RoleBadgeMeta {
  label: string;
  border: string;
  text: string;
  bg: string;
  darkBg: string;
  icon: ReactNode;
}

const ROLE_DISPLAY: Record<string, RoleBadgeMeta> = {
  SUBSCRIBER: {
    label: "Subscriber",
    border: "border-gray-400",
    text: "text-gray-600 dark:text-gray-300",
    bg: "bg-gray-100",
    darkBg: "dark:bg-gray-800/60",
    icon: <User className="h-3 w-3" />,
  },
  CONTRIBUTOR: {
    label: "Contributor",
    border: "border-yellow-400",
    text: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-50",
    darkBg: "dark:bg-yellow-950/40",
    icon: <Pencil className="h-3 w-3" />,
  },
  AUTHOR: {
    label: "Author",
    border: "border-green-400",
    text: "text-green-700 dark:text-green-300",
    bg: "bg-green-50",
    darkBg: "dark:bg-green-950/40",
    icon: <BookOpen className="h-3 w-3" />,
  },
  EDITOR: {
    label: "Editor",
    border: "border-blue-400",
    text: "text-blue-700 dark:text-blue-300",
    bg: "bg-blue-50",
    darkBg: "dark:bg-blue-950/40",
    icon: <Edit3 className="h-3 w-3" />,
  },
  ADMINISTRATOR: {
    label: "Administrator",
    border: "border-purple-400",
    text: "text-purple-700 dark:text-purple-300",
    bg: "bg-purple-50",
    darkBg: "dark:bg-purple-950/40",
    icon: <Shield className="h-3 w-3" />,
  },
  SUPER_ADMIN: {
    label: "Super Admin",
    border: "border-red-400",
    text: "text-red-700 dark:text-red-300",
    bg: "bg-red-50",
    darkBg: "dark:bg-red-950/40",
    icon: <Crown className="h-3 w-3" />,
  },
};

// ─── RoleBadge ──────────────────────────────────────────────────────────────

interface RoleBadgeProps {
  role: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export function RoleBadge({
  role,
  size = "sm",
  showIcon = true,
  className = "",
}: RoleBadgeProps) {
  const meta = ROLE_DISPLAY[role] ?? ROLE_DISPLAY.SUBSCRIBER;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${meta.border} ${meta.text} ${meta.bg} ${meta.darkBg} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && meta.icon}
      {meta.label}
    </span>
  );
}

export { ROLE_DISPLAY };
