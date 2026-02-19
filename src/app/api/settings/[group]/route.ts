/**
 * /api/settings/[group] — Read/update individual setting groups.
 *
 * Supported groups: topbar, announcement, navigation, appearance, footer,
 *   social, seo, reading, privacy, captcha, pwa, email, media,
 *   date-locale, robots, maintenance, integrations, contact, identity,
 *   custom-code
 *
 * GET  → returns only the fields for that group
 * PATCH → validates with the group's dedicated Zod schema and updates
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { siteSettingsService } from "@/server/wiring";
import {
  updateTopBarSchema,
  updateAnnouncementSchema,
  updateNavigationSchema,
  updateAppearanceSchema,
  updateFooterSchema,
  updateSocialLinksSchema,
  updateSeoSchema,
  updateReadingSchema,
  updatePrivacySchema,
  updateCaptchaSchema,
  updatePwaSchema,
  updateEmailSenderSchema,
  updateMediaSchema,
  updateDateLocaleSchema,
  updateRobotsSchema,
  updateMaintenanceSchema,
  updateIntegrationsSchema,
  updateIdentitySchema,
  updateContactSchema,
  updateCustomCodeSchema,
  updateModuleKillSwitchSchema,
  updateAdminBarSchema,
} from "@/features/settings/server/schemas";
import { createLogger } from "@/server/observability/logger";
import type { ZodSchema } from "zod";

const logger = createLogger("api/settings/[group]");

/** Require ADMINISTRATOR or SUPER_ADMIN role. */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  const role = session.user.role;
  if (!["ADMINISTRATOR", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
  return session;
}

type GroupSpec = {
  getter: () => Promise<unknown>;
  schema: ZodSchema;
};

function getGroupSpec(group: string): GroupSpec | null {
  const specs: Record<string, GroupSpec> = {
    topbar: { getter: () => siteSettingsService.getTopBarConfig(), schema: updateTopBarSchema },
    announcement: { getter: () => siteSettingsService.getAnnouncementConfig(), schema: updateAnnouncementSchema },
    navigation: { getter: () => siteSettingsService.getNavigationConfig(), schema: updateNavigationSchema },
    appearance: { getter: () => siteSettingsService.getAppearanceConfig(), schema: updateAppearanceSchema },
    footer: { getter: () => siteSettingsService.getFooterConfig(), schema: updateFooterSchema },
    social: { getter: () => siteSettingsService.getSocialLinks(), schema: updateSocialLinksSchema },
    seo: { getter: () => siteSettingsService.getSeoConfig(), schema: updateSeoSchema },
    reading: { getter: () => siteSettingsService.getReadingConfig(), schema: updateReadingSchema },
    privacy: { getter: () => siteSettingsService.getPrivacyConfig(), schema: updatePrivacySchema },
    captcha: { getter: () => siteSettingsService.getCaptchaConfig(), schema: updateCaptchaSchema },
    pwa: { getter: () => siteSettingsService.getPwaConfig(), schema: updatePwaSchema },
    email: { getter: () => siteSettingsService.getEmailSenderConfig(), schema: updateEmailSenderSchema },
    media: { getter: () => siteSettingsService.getMediaConfig(), schema: updateMediaSchema },
    "date-locale": { getter: () => siteSettingsService.getDateLocaleConfig(), schema: updateDateLocaleSchema },
    robots: { getter: () => siteSettingsService.getRobotsConfig(), schema: updateRobotsSchema },
    maintenance: { getter: () => siteSettingsService.getMaintenanceConfig(), schema: updateMaintenanceSchema },
    integrations: { getter: () => siteSettingsService.getIntegrationConfig(), schema: updateIntegrationsSchema },
    identity: { getter: () => siteSettingsService.getIdentityConfig(), schema: updateIdentitySchema },
    contact: { getter: () => siteSettingsService.getContactConfig(), schema: updateContactSchema },
    "custom-code": { getter: () => siteSettingsService.getCustomCodeConfig(), schema: updateCustomCodeSchema },
    "kill-switches": { getter: () => siteSettingsService.getModuleKillSwitchConfig(), schema: updateModuleKillSwitchSchema },
    "admin-bar": { getter: () => siteSettingsService.getAdminBarConfig(), schema: updateAdminBarSchema },
  };
  return specs[group] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { group } = await params;
    const spec = getGroupSpec(group);
    if (!spec) {
      return NextResponse.json(
        { success: false, error: `Unknown settings group: "${group}"` },
        { status: 404 },
      );
    }

    const data = await spec.getter();
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error("[api/settings/[group]] GET error:", { error });
    return NextResponse.json({ success: false, error: "Failed to fetch setting group" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ group: string }> },
) {
  try {
    const guard = await requireAdmin();
    if (guard instanceof NextResponse) return guard;

    const { group } = await params;
    const spec = getGroupSpec(group);
    if (!spec) {
      return NextResponse.json(
        { success: false, error: `Unknown settings group: "${group}"` },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = spec.schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const updatedBy = guard.user.id ?? guard.user.email ?? undefined;
    const result = await siteSettingsService.updateSettings(
      parsed.data as Record<string, unknown>,
      updatedBy,
    );

    if (!result.success) {
      const statusCode = 'error' in result && typeof result.error === 'object' && result.error !== null && 'statusCode' in result.error
        ? (result.error as { statusCode: number }).statusCode
        : 500;
      return NextResponse.json(result, { status: statusCode });
    }

    // Return only the group's updated data
    const freshData = await spec.getter();
    return NextResponse.json({ success: true, data: freshData, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error("[api/settings/[group]] PATCH error:", { error });
    return NextResponse.json({ success: false, error: "Failed to update setting group" }, { status: 500 });
  }
}
