"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { TopBar } from "./TopBar";

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

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [topBarSettings, setTopBarSettings] = useState<TopBarSettings | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/settings/public")
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setTopBarSettings(data.data);
          }
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {topBarSettings && <TopBar settings={topBarSettings} />}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
