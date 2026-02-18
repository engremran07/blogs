import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { siteSettingsService, commentAdminSettings } from "@/server/wiring";
import { updateSiteSettingsSchema } from "@/features/settings/server/schemas";
import { createLogger } from "@/server/observability/logger";

const logger = createLogger("api/settings");

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

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const result = await siteSettingsService.getSettingsResponse();
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/settings] GET error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const body = await req.json();
    const parsed = updateSiteSettingsSchema.safeParse(body);
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

    const updatedBy = guard.user.id ?? guard.user.email ?? undefined;
    const result = await siteSettingsService.updateSettings(
      parsed.data as Record<string, unknown>,
      updatedBy,
    );

    // Sync enableComments → CommentSettings.commentsEnabled (single source of truth)
    if ('enableComments' in parsed.data && parsed.data.enableComments !== undefined) {
      try {
        await commentAdminSettings.updateSettings(
          { commentsEnabled: parsed.data.enableComments as boolean },
          updatedBy ?? "system",
        );
      } catch (err) {
        logger.error("[api/settings] Failed to sync enableComments to CommentSettings", { error: err });
      }
    }

    if (!result.success) {
      const statusCode = 'error' in result && typeof result.error === 'object' && 'statusCode' in result.error
        ? result.error.statusCode
        : 400;
      return NextResponse.json(result, { status: statusCode });
    }
    return NextResponse.json(result);
  } catch (error) {
    logger.error("[api/settings] PATCH error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
