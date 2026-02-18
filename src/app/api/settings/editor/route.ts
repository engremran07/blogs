import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { editorAdminSettings } from "@/server/wiring";
import { z } from "zod";
import { updateEditorSettingsSchema } from "@/features/editor/server/schemas";
import { createLogger } from "@/server/observability/logger";

const postActionSchema = z.object({
  action: z.enum(["simple-mode", "full-mode", "disable", "enable"]),
});

const logger = createLogger("api/settings/editor");

/** Lazy-initialise the editor settings service if it hasn't been initialised yet. */
let _initPromise: Promise<void> | null = null;
async function ensureEditorInit() {
  if (!editorAdminSettings.getSettings()) {
    // Deduplicate concurrent callers
    if (!_initPromise) {
      _initPromise = editorAdminSettings.initialise().finally(() => {
        _initPromise = null;
      });
    }
    await _initPromise;
  }
}

/**
 * Require ADMINISTRATOR or SUPER_ADMIN role.
 * Returns the session if authorised, or a 401/403 Response.
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 },
    );
  }
  const role = session.user.role;
  if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden — admin role required" },
      { status: 403 },
    );
  }
  return session;
}

/**
 * GET /api/settings/editor
 * Returns the current editor admin settings (for admin panel display).
 */
export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    await ensureEditorInit();
    const rawSettings = editorAdminSettings.getSettings();
    const overview = editorAdminSettings.getAdminOverview();
    const frontendSettings = editorAdminSettings.getFrontendSettings();

    // Strip internal DB fields from admin settings
    let settings = rawSettings;
    if (rawSettings) {
      const { id: _stripId, ...safeSettings } = rawSettings;
      settings = safeSettings as typeof rawSettings;
    }

    return NextResponse.json({
      success: true,
      data: {
        settings,
        overview,
        frontendSettings,
      },
    });
  } catch (error) {
    logger.error("[api/settings/editor] GET error:", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: "Failed to fetch editor settings" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/settings/editor
 * Update editor admin settings (feature toggles, limits, palette, etc.).
 */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    await ensureEditorInit();
    const body = await req.json();
    const parsed = updateEditorSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const adminUserId = guard.user.id ?? guard.user.email ?? "unknown";

    const result = await editorAdminSettings.updateSettings(
      parsed.data,
      adminUserId,
    );

    if (!result.success) {
      const statusCode =
        "error" in result &&
        typeof result.error === "object" &&
        result.error !== null &&
        "statusCode" in result.error
          ? (result.error as { statusCode?: number }).statusCode ?? 400
          : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/settings/editor] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update editor settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/settings/editor
 * Special actions: simple-mode, full-mode, kill-switch.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const parsed = postActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid action. Valid actions: simple-mode, full-mode, disable, enable",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { action } = parsed.data;
    const adminUserId = guard.user.id ?? guard.user.email ?? "unknown";

    await ensureEditorInit();
    let result;

    switch (action) {
      case "simple-mode":
        result = await editorAdminSettings.applySimpleMode(adminUserId);
        break;
      case "full-mode":
        result = await editorAdminSettings.applyFullMode(adminUserId);
        break;
      case "disable":
        result = await editorAdminSettings.disableEditor(adminUserId);
        break;
      case "enable":
        result = await editorAdminSettings.enableEditor(adminUserId);
        break;
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/settings/editor] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to execute editor action" },
      { status: 500 },
    );
  }
}
