"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";
import { CookieConsentBanner, type CookieConsentSettings } from "./CookieConsentBanner";
import { AnalyticsScripts } from "./AnalyticsScripts";

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
  cookieConsentEnabled: boolean;
  cookieConsentMessage: string;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  gdprEnabled: boolean;
  seoGoogleAnalyticsId: string | null;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [settings, setSettings] = useState<PublicSettings | null>(null);

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

  return (
    <div className="flex min-h-screen flex-col">
      {settings && <TopBar settings={settings} />}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      {consentSettings && <CookieConsentBanner settings={consentSettings} />}
      {settings && (
        <AnalyticsScripts
          gaId={settings.seoGoogleAnalyticsId}
          gdprEnabled={settings.gdprEnabled}
        />
      )}
    </div>
  );
}
