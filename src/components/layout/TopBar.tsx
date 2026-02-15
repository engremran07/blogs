"use client";

import { useState, useEffect } from "react";
import { Phone, Mail, MapPin, X, Clock } from "lucide-react";

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

export function TopBar({ settings }: { settings: TopBarSettings }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem("topBarDismissed") === "1");
    }
  }, []);

  if (!settings.topBarEnabled || dismissed) return null;

  const hasLeft = settings.topBarPhone || settings.topBarEmail || settings.topBarAddress;
  const hasRight = settings.topBarText || settings.topBarBusinessHours || settings.topBarCtaText;

  if (!hasLeft && !hasRight) return null;

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("topBarDismissed", "1");
  }

  return (
    <div
      className="relative z-50 text-xs"
      style={{
        backgroundColor: settings.topBarBackgroundColor || "#1a1a2e",
        color: settings.topBarTextColor || "#ffffff",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
        {/* Left: Contact info */}
        <div className="flex items-center gap-4 overflow-hidden">
          {settings.topBarPhone && (
            <a href={`tel:${settings.topBarPhone}`} className="flex items-center gap-1 whitespace-nowrap opacity-90 hover:opacity-100">
              <Phone className="h-3 w-3" />
              {settings.topBarPhone}
            </a>
          )}
          {settings.topBarEmail && (
            <a href={`mailto:${settings.topBarEmail}`} className="flex items-center gap-1 whitespace-nowrap opacity-90 hover:opacity-100">
              <Mail className="h-3 w-3" />
              <span className="hidden sm:inline">{settings.topBarEmail}</span>
            </a>
          )}
          {settings.topBarAddress && (
            <span className="hidden items-center gap-1 whitespace-nowrap opacity-90 md:flex">
              <MapPin className="h-3 w-3" />
              {settings.topBarAddress}
            </span>
          )}
        </div>

        {/* Right: Text, hours, CTA */}
        <div className="flex items-center gap-4">
          {settings.topBarText && (
            <span className="hidden whitespace-nowrap opacity-90 sm:inline">{settings.topBarText}</span>
          )}
          {settings.topBarBusinessHours && (
            <span className="hidden items-center gap-1 whitespace-nowrap opacity-80 lg:flex">
              <Clock className="h-3 w-3" />
              {settings.topBarBusinessHours}
            </span>
          )}
          {settings.topBarCtaText && settings.topBarCtaUrl && (
            <a
              href={settings.topBarCtaUrl}
              className="rounded px-2 py-0.5 font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: settings.topBarTextColor || "#fff",
                color: settings.topBarBackgroundColor || "#1a1a2e",
              }}
            >
              {settings.topBarCtaText}
            </a>
          )}
          {settings.topBarDismissible && (
            <button
              onClick={handleDismiss}
              className="ml-1 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Dismiss top bar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
