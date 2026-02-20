"use client";

import { useSyncExternalStore } from "react";
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

interface SocialLinks {
  github: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
}

/** Simple inline SVG social icons (16×16). */
const SocialIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    facebook: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
      </svg>
    ),
    twitter: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    github: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  };
  return <>{icons[type] ?? null}</>;
};

function subscribeTopBarDismissed(callback: () => void) {
  window.addEventListener("topbar-dismissed", callback);
  return () => window.removeEventListener("topbar-dismissed", callback);
}

function getTopBarDismissedSnapshot() {
  return sessionStorage.getItem("topBarDismissed") === "1";
}

const getTopBarDismissedServerSnapshot = () => false;

export function TopBar({ settings, socialLinks }: { settings: TopBarSettings; socialLinks?: SocialLinks | null }) {
  const dismissed = useSyncExternalStore(
    subscribeTopBarDismissed,
    getTopBarDismissedSnapshot,
    getTopBarDismissedServerSnapshot,
  );

  if (!settings.topBarEnabled || dismissed) return null;

  function handleDismiss() {
    sessionStorage.setItem("topBarDismissed", "1");
    window.dispatchEvent(new Event("topbar-dismissed"));
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
          {/* Social links */}
          {settings.topBarShowSocialLinks && socialLinks && (
            <div className="hidden items-center gap-2 sm:flex">
              {(Object.entries(socialLinks) as [string, string | null][])
                .filter(([, url]) => !!url)
                .map(([type, url]) => (
                  <a
                    key={type}
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-70 transition-opacity hover:opacity-100"
                    aria-label={type}
                  >
                    <SocialIcon type={type} />
                  </a>
                ))}
            </div>
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
