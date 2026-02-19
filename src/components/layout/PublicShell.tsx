"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";
import {
  CookieConsentBanner,
  type CookieConsentSettings,
} from "./CookieConsentBanner";
import { AnalyticsScripts } from "./AnalyticsScripts";

const ADMIN_BAR_ROLES = new Set(["EDITOR", "ADMINISTRATOR", "SUPER_ADMIN"]);

interface TopBarSettings {
  topBarEnabled: boolean;
  topBarPhone: string | null;
  topBarEmail: string | null;
  topBarAddress: string | null;
  topBarText: string | null;
  topBarShowSocialLinks: boolean;
  topBarBusinessHours: string | null;
  topBarBackgroundColor: string;
  topBarTextColor: string;
  topBarCtaText: string | null;
  topBarCtaUrl: string | null;
  topBarDismissible: boolean;
}

interface PublicSettings extends TopBarSettings {
  siteName: string;
  siteDescription: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  darkModeEnabled: boolean;
  navShowDarkModeToggle: boolean;
  cookieConsentEnabled: boolean;
  cookieConsentMessage: string;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  gdprEnabled: boolean;
  seoGoogleAnalyticsId: string | null;
  socialGithub: string | null;
  socialTwitter: string | null;
  socialFacebook: string | null;
  socialInstagram: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
}

export function PublicShell({
  children,
  headerAdSlot,
  footerAdSlot,
  overlayAdSlot,
}: {
  children: React.ReactNode;
  headerAdSlot?: React.ReactNode;
  footerAdSlot?: React.ReactNode;
  overlayAdSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const { data: session, status: sessionStatus } = useSession();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  // Only apply admin bar padding after session is resolved to avoid SSR mismatch
  // During SSR, sessionStatus is always "loading" so hasAdminBar is false on both sides
  const hasAdminBar =
    sessionStatus === "authenticated" &&
    ADMIN_BAR_ROLES.has(session?.user?.role as string);

  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/settings/public")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setSettings(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  const consentSettings: CookieConsentSettings | null = settings
    ? {
        cookieConsentEnabled: settings.cookieConsentEnabled,
        cookieConsentMessage: settings.cookieConsentMessage,
        privacyPolicyUrl: settings.privacyPolicyUrl,
        termsOfServiceUrl: settings.termsOfServiceUrl,
        gdprEnabled: settings.gdprEnabled,
      }
    : null;

  const siteName = settings?.siteName || "MyBlog";
  const logoUrl = settings?.logoUrl ?? null;
  const showDarkModeToggle =
    (settings?.darkModeEnabled ?? true) &&
    (settings?.navShowDarkModeToggle ?? true);
  const socialLinks = settings
    ? {
        github: settings.socialGithub,
        twitter: settings.socialTwitter,
        facebook: settings.socialFacebook,
        instagram: settings.socialInstagram,
        linkedin: settings.socialLinkedin,
        youtube: settings.socialYoutube,
      }
    : null;

  return (
    <div className={`flex min-h-screen flex-col${hasAdminBar ? " pt-11" : ""}`}>
      {settings && <TopBar settings={settings} />}
      <Header
        siteName={siteName}
        logoUrl={logoUrl}
        showDarkModeToggle={showDarkModeToggle}
      />
      {headerAdSlot}
      <main className="flex-1">{children}</main>
      {footerAdSlot}
      <Footer siteName={siteName} socialLinks={socialLinks} logoUrl={logoUrl} />
      {consentSettings && <CookieConsentBanner settings={consentSettings} />}
      {settings && (
        <AnalyticsScripts
          gaId={settings.seoGoogleAnalyticsId}
          gdprEnabled={settings.gdprEnabled}
        />
      )}
      {overlayAdSlot}
    </div>
  );
}
