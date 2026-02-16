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
        logoUrl: (s as any).logoUrl ?? null,
        logoDarkUrl: (s as any).logoDarkUrl ?? null,
        faviconUrl: (s as any).faviconUrl ?? null,

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
        socialFacebook: (s as any).socialFacebook ?? null,
        socialTwitter: (s as any).socialTwitter ?? null,
        socialInstagram: (s as any).socialInstagram ?? null,
        socialLinkedin: (s as any).socialLinkedin ?? null,
        socialYoutube: (s as any).socialYoutube ?? null,
        socialGithub: (s as any).socialGithub ?? null,

        // Appearance / Theme
        primaryColor: (s as any).primaryColor ?? null,
        darkModeEnabled: (s as any).darkModeEnabled ?? true,
        fontFamily: (s as any).fontFamily ?? null,

        // Footer
        footerText: (s as any).footerText ?? null,
        footerShowSocialLinks: (s as any).footerShowSocialLinks ?? true,

        // Cookie consent / Privacy
        cookieConsentEnabled: s.cookieConsentEnabled ?? false,
        cookieConsentMessage: s.cookieConsentMessage ?? "",
        privacyPolicyUrl: (s as any).privacyPolicyUrl ?? null,
        termsOfServiceUrl: (s as any).termsOfServiceUrl ?? null,
        gdprEnabled: (s as any).gdprEnabled ?? false,

        // Analytics (non-secret — needed by script injector)
        seoGoogleAnalyticsId: (s as any).seoGoogleAnalyticsId ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to load public settings" },
      { status: 500 },
    );
  }
}
