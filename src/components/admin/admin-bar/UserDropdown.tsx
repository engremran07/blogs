"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Key,
  LogOut,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { ROLE_COLORS, ROLE_LABELS } from "./constants";
import type { Session } from "next-auth";

const DROPDOWN_ID = "user-menu";

export function UserDropdown({ session }: { session: Session }) {
  const { activeDropdown, toggleDropdown, closeDropdown, settings } =
    useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;

  if (!settings.adminBarShowUserDropdown) return null;

  const user = session.user;
  const displayName = user.name || user.username || "Admin";
  const role = user.role ?? "AUTHOR";
  const initial = displayName.charAt(0).toUpperCase();
  const gradient = ROLE_COLORS[role] ?? "from-gray-500 to-gray-700";
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={() => toggleDropdown(DROPDOWN_ID)}
        className="flex items-center gap-1.5 rounded px-1.5 py-1 text-sm transition-colors hover:bg-white/10"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User menu for ${displayName}`}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br text-[11px] font-bold text-white ${gradient}`}
        >
          {initial}
        </div>
        <span className="hidden max-w-20 truncate text-gray-200 sm:inline">
          {displayName}
        </span>
        <ChevronDown className="h-3 w-3 text-gray-400" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/10 bg-[#1a1a2e] py-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
          aria-label="User menu"
        >
          {/* User info */}
          <div className="border-b border-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br text-sm font-bold text-white ${gradient}`}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {displayName}
                </div>
                <div className="truncate text-xs text-gray-400">
                  {user.email}
                </div>
              </div>
            </div>
            <span className="mt-1.5 inline-block rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
              {roleLabel}
            </span>
          </div>

          <Link
            href="/profile"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <LayoutDashboard className="h-4 w-4" />
            My Profile
          </Link>
          <Link
            href="/profile#password"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Key className="h-4 w-4" />
            Change Password
          </Link>
          <Link
            href="/admin/settings"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <Settings className="h-4 w-4" />
            Preferences
          </Link>

          <div className="my-1 border-t border-white/5" />

          <button
            onClick={() => {
              closeDropdown();
              signOut({ callbackUrl: "/" });
            }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
