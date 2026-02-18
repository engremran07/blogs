/**
 * /api/settings/public — Public (no auth) endpoint returning only
 * the settings fields needed by the public-facing layout (TopBar, theme, etc.).
 *
 * Intentionally excludes sensitive data (API keys, admin IPs, analytics IDs, etc.).
 */
import { NextResponse } from "next/server";
import { siteSettingsService } from "@/server/wiring";

export async function GET() {
  try {
    const s = await siteSettingsService.getSettings();

    return NextResponse.json({
      success: true,
      data: {
        // Site identity
        siteName: s.siteName,
        siteTagline: s.siteTagline,
        siteDescription: s.siteDescription,
        logoUrl: s.logoUrl ?? null,
        logoDarkUrl: s.logoDarkUrl ?? null,
        faviconUrl: s.faviconUrl ?? null,

        // Top Bar
        topBarEnabled: s.topBarEnabled,
        topBarPhone: s.topBarPhone,
        topBarEmail: s.topBarEmail,
        topBarAddress: s.topBarAddress,
        topBarText: s.topBarText,
        topBarShowSocialLinks: s.topBarShowSocialLinks,
        topBarBusinessHours: s.topBarBusinessHours,
        topBarBackgroundColor: s.topBarBackgroundColor,
        topBarTextColor: s.topBarTextColor,
        topBarCtaText: s.topBarCtaText,
        topBarCtaUrl: s.topBarCtaUrl,
        topBarDismissible: s.topBarDismissible,

        // Social links (needed when topBarShowSocialLinks is true)
        socialFacebook: s.socialFacebook ?? null,
        socialTwitter: s.socialTwitter ?? null,
        socialInstagram: s.socialInstagram ?? null,
        socialLinkedin: s.socialLinkedin ?? null,
        socialYoutube: s.socialYoutube ?? null,
        socialGithub: s.socialGithub ?? null,

        // Appearance / Theme
        primaryColor: s.primaryColor ?? null,
        darkModeEnabled: s.darkModeEnabled ?? true,
        fontFamily: s.fontFamily ?? null,

        // Footer
        footerText: s.footerText ?? null,
        footerShowSocialLinks: s.footerShowSocialLinks ?? true,

        // Registration
        enableRegistration: s.enableRegistration ?? true,

        // Cookie consent / Privacy
        cookieConsentEnabled: s.cookieConsentEnabled ?? false,
        cookieConsentMessage: s.cookieConsentMessage ?? "",
        privacyPolicyUrl: s.privacyPolicyUrl ?? null,
        termsOfServiceUrl: s.termsOfServiceUrl ?? null,
        gdprEnabled: s.gdprEnabled ?? false,

        // Analytics (non-secret — needed by script injector)
        seoGoogleAnalyticsId: s.seoGoogleAnalyticsId ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to load public settings" },
      { status: 500 },
    );
  }
}
