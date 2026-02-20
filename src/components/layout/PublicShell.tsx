"use client";

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
  menuStructure: MenuData[] | null;
}

/** Shape of a menu entry saved by the Menu Builder admin page. */
interface MenuData {
  id: string;
  name: string;
  slot: string;
  enabled: boolean;
  items: { id: string; label: string; url: string; target: string; visible: boolean }[];
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
  const { data: session, status: sessionStatus } = useSession();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  // Only apply admin bar padding after session is resolved to avoid SSR mismatch
  // During SSR, sessionStatus is always "loading" so hasAdminBar is false on both sides
  const hasAdminBar =
    sessionStatus === "authenticated" &&
    ADMIN_BAR_ROLES.has(session?.user?.role as string);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setSettings(data.data);
        }
      })
      .catch(() => {});
  }, []);

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

  // Extract header nav items from the menu builder (slot = "header", enabled + visible items)
  const headerMenuItems = (() => {
    const menus = settings?.menuStructure;
    if (!Array.isArray(menus)) return undefined;
    const headerMenu = menus.find((m) => m.slot === "header" && m.enabled);
    if (!headerMenu) return undefined;
    return headerMenu.items
      .filter((item) => item.visible)
      .map((item) => ({ href: item.url, label: item.label, target: item.target }));
  })();

  return (
    <div className={`flex min-h-screen flex-col${hasAdminBar ? " pt-11" : ""}`}>
      {settings && <TopBar settings={settings} socialLinks={socialLinks} />}
      <Header
        siteName={siteName}
        logoUrl={logoUrl}
        showDarkModeToggle={showDarkModeToggle}
        menuItems={headerMenuItems}
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
