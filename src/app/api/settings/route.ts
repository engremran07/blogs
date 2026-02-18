import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { siteSettingsService, commentAdminSettings, captchaAdminSettings } from "@/server/wiring";
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

    // Sync captcha fields → CaptchaSettings (single source of truth for orchestrator)
    const captchaFields = [
      'captchaEnabled', 'enableTurnstile', 'enableRecaptchaV3', 'enableRecaptchaV2',
      'enableHcaptcha', 'enableInhouse', 'turnstileSiteKey', 'recaptchaV3SiteKey',
      'recaptchaV2SiteKey', 'hcaptchaSiteKey', 'inhouseCodeLength',
      'requireCaptchaLogin', 'requireCaptchaRegister', 'requireCaptchaComment', 'requireCaptchaContact',
    ] as const;
    // Map SiteSettings field names → CaptchaSettings field names
    const fieldMap: Record<string, string> = {
      requireCaptchaLogin: 'requireCaptchaForLogin',
      requireCaptchaRegister: 'requireCaptchaForRegistration',
      requireCaptchaComment: 'requireCaptchaForComments',
      requireCaptchaContact: 'requireCaptchaForContact',
    };
    const captchaSync: Record<string, unknown> = {};
    for (const f of captchaFields) {
      if (f in parsed.data && (parsed.data as Record<string, unknown>)[f] !== undefined) {
        const target = fieldMap[f] ?? f;
        captchaSync[target] = (parsed.data as Record<string, unknown>)[f];
      }
    }
    if (Object.keys(captchaSync).length > 0) {
      try {
        await captchaAdminSettings.updateSettings(captchaSync, updatedBy ?? "system");
      } catch (err) {
        logger.error("[api/settings] Failed to sync captcha fields to CaptchaSettings", { error: err });
      }
    }

    // Sync ALL comment fields from SiteSettings → CommentSettings (single source of truth)
    const commentFieldMap: Record<string, string> = {
      enableComments: 'commentsEnabled',
      enableCommentModeration: 'requireModeration',
      enableCommentVoting: 'enableVoting',
      enableCommentThreading: 'enableThreading',
      allowGuestComments: 'allowGuestComments',
      maxReplyDepth: 'maxReplyDepth',
      closeCommentsAfterDays: 'closeCommentsAfterDays',
      editWindowMinutes: 'editWindowMinutes',
    };
    const commentSync: Record<string, unknown> = {};
    for (const [siteField, commentField] of Object.entries(commentFieldMap)) {
      if (siteField in parsed.data && (parsed.data as Record<string, unknown>)[siteField] !== undefined) {
        commentSync[commentField] = (parsed.data as Record<string, unknown>)[siteField];
      }
    }
    // Special case: autoApproveComments (boolean) → autoApproveThreshold (int)
    // true = threshold 0 (always auto-approve), false = threshold 3 (require N approved first)
    if ('autoApproveComments' in parsed.data && parsed.data.autoApproveComments !== undefined) {
      commentSync.autoApproveThreshold = (parsed.data as Record<string, unknown>).autoApproveComments ? 0 : 3;
    }
    if (Object.keys(commentSync).length > 0) {
      try {
        await commentAdminSettings.updateSettings(commentSync, updatedBy ?? "system");
      } catch (err) {
        logger.error("[api/settings] Failed to sync comment fields to CommentSettings", { error: err });
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
