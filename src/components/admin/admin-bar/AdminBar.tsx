"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, X } from "lucide-react";
import { AdminBarProvider, useAdminBar } from "./AdminBarProvider";
import { LeftZone } from "./LeftZone";
import { ContextZone } from "./ContextZone";
import { RightZone } from "./RightZone";
import { useRouteIntelligence } from "./useRouteIntelligence";
import { useEditorStatus } from "../EditorContext";
import { ADMIN_BAR_HEIGHT_PX } from "./constants";
import type { UserRole } from "@/features/auth/types";

/* ── Role gate ── */

const ADMIN_BAR_ROLES: readonly UserRole[] = [
  "EDITOR",
  "ADMINISTRATOR",
  "SUPER_ADMIN",
] as const;

function hasAdminBarAccess(role: string | undefined): boolean {
  return ADMIN_BAR_ROLES.includes(role as UserRole);
}

/* ── Height constant ── */
export { ADMIN_BAR_HEIGHT_PX as ADMIN_BAR_HEIGHT } from "./constants";

/* ── Inner bar (needs AdminBarProvider context) ── */

function AdminBarInner() {
  const { data: session, status: sessionStatus } = useSession();
  const pathname = usePathname();
  const route = useRouteIntelligence();
  const editor = useEditorStatus();
  const { previewMode, exitPreview, settings } = useAdminBar();

  // Don't render until session is resolved
  if (sessionStatus === "loading") return null;
  if (!session?.user || !hasAdminBarAccess(session.user.role)) return null;
  if (!settings.adminBarEnabled) return null;

  // Preview mode — hide bar, show floating exit button
  if (previewMode) {
    return (
      <button
        onClick={exitPreview}
        className="fixed bottom-4 right-4 z-9999 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10 transition-transform hover:scale-105"
        aria-label="Exit preview mode"
      >
        <Eye className="h-4 w-4" />
        Exit Preview
        <X className="h-3.5 w-3.5 text-gray-400" />
      </button>
    );
  }

  return (
    <div
      id="admin-bar"
      className="fixed inset-x-0 top-0 z-9999 flex items-center px-3"
      style={{
        height: ADMIN_BAR_HEIGHT_PX,
        background: `linear-gradient(90deg, ${settings.adminBarBackgroundColor}, #13131f, ${settings.adminBarBackgroundColor})`,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
      role="navigation"
      aria-label="Admin bar"
    >
      {/* Left zone */}
      <LeftZone route={route} pathname={pathname} />

      {/* Context zone (middle) */}
      <ContextZone route={route} editor={editor} />

      {/* Right zone */}
      <RightZone route={route} editor={editor} session={session} />
    </div>
  );
}

/* ── Public export (wraps with provider) ── */

export function AdminBar() {
  return (
    <AdminBarProvider>
      <AdminBarInner />
    </AdminBarProvider>
  );
}
