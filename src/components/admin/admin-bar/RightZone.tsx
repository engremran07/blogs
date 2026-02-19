"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Globe, Monitor, Save, Rocket, Eye } from "lucide-react";
import { useAdminBar } from "./AdminBarProvider";
import { NewDropdown } from "./NewDropdown";
import { UserDropdown } from "./UserDropdown";
import type { RouteIntelligence } from "./useRouteIntelligence";
import type { EditorStatus } from "../EditorContext";
import { toast } from "@/components/ui/Toast";
import type { Session } from "next-auth";

/**
 * Right zone of the AdminBar:
 *  - + New dropdown
 *  - View Site / Admin button
 *  - Preview as Visitor button (editor only)
 *  - Save button (editor only)
 *  - Publish button (editor only, draft)
 *  - User dropdown
 */
export function RightZone({
  route,
  editor,
  session,
}: {
  route: RouteIntelligence;
  editor: EditorStatus | null;
  session: Session;
}) {
  const { settings, enterPreview, closeDropdown } = useAdminBar();

  // Save handler — awaits the save before toasting
  const handleSave = useCallback(async () => {
    try {
      await editor?.handleSave?.();
      toast("Changes saved!", "success");
    } catch {
      toast("Save failed", "error");
    }
  }, [editor]);

  // Publish handler — awaits the save before toasting
  const handlePublish = useCallback(async () => {
    try {
      await editor?.handleSave?.("PUBLISHED");
      toast("Published successfully!", "success");
    } catch {
      toast("Publish failed", "error");
    }
  }, [editor]);

  const canPublish =
    settings.adminBarShowPublishButton &&
    route.isEditor &&
    editor?.status === "DRAFT";

  const canSave =
    settings.adminBarShowSaveButton && route.isEditor && editor?.handleSave;

  return (
    <div className="flex shrink-0 items-center gap-1">
      {/* + New dropdown */}
      <NewDropdown />

      {/* View Site / Admin switch */}
      {settings.adminBarShowViewSiteButton && (
        <>
          {route.isAdmin ? (
            <Link
              href="/"
              target="_blank"
              onClick={closeDropdown}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Site</span>
            </Link>
          ) : (
            <Link
              href="/admin"
              onClick={closeDropdown}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
          )}
        </>
      )}

      {/* Preview as Visitor — editor pages only */}
      {settings.adminBarShowPreviewButton && route.isEditor && (
        <button
          onClick={enterPreview}
          className="flex items-center gap-1 rounded px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          title="Preview as Visitor"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Preview</span>
        </button>
      )}

      {/* Save button — editor pages only */}
      {canSave && (
        <button
          onClick={handleSave}
          className="flex items-center gap-1 rounded px-3 py-1 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: settings.adminBarAccentColor }}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </button>
      )}

      {/* Publish button — editor pages, draft only */}
      {canPublish && (
        <button
          onClick={handlePublish}
          className="flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-500"
        >
          <Rocket className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Publish</span>
        </button>
      )}

      {/* User dropdown */}
      <UserDropdown session={session} />
    </div>
  );
}
