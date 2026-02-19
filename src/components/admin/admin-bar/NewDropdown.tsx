"use client";

import Link from "next/link";
import {
  FileText,
  File,
  Image as ImageIcon,
  FolderTree,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";

const DROPDOWN_ID = "new-menu";

export function NewDropdown() {
  const { activeDropdown, toggleDropdown, closeDropdown, settings } =
    useAdminBar();
  const isOpen = activeDropdown === DROPDOWN_ID;

  if (!settings.adminBarShowNewButton) return null;

  return (
    <div className="relative" data-admin-bar-dropdown>
      <button
        onClick={() => toggleDropdown(DROPDOWN_ID)}
        className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        aria-label="Create new content"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-white/10 bg-[#1a1a2e] py-1 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150"
          role="menu"
          aria-label="Create new"
        >
          <Link
            href="/admin/posts/new"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <FileText className="h-4 w-4" />
            New Post
          </Link>
          <Link
            href="/admin/pages/new"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <File className="h-4 w-4" />
            New Page
          </Link>
          <Link
            href="/admin/media"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <ImageIcon className="h-4 w-4" />
            Media Library
          </Link>
          <Link
            href="/admin/categories"
            onClick={closeDropdown}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
            role="menuitem"
          >
            <FolderTree className="h-4 w-4" />
            Categories
          </Link>
        </div>
      )}
    </div>
  );
}
