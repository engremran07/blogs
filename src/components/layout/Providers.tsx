"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "@/components/ui/Toast";
import { CsrfFetchInterceptor } from "@/components/providers/CsrfFetchInterceptor";

export interface ThemeVars {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headingFontFamily: string;
}

interface ProvidersProps {
  children: React.ReactNode;
  darkModeEnabled?: boolean;
  darkModeDefault?: boolean;
  theme?: ThemeVars;
  nonce?: string;
}

/**
 * Apply theme CSS variables via `document.documentElement.style` (inline style
 * specificity) so they always override the `:root` defaults in globals.css
 * regardless of stylesheet load order.
 */
export function applyThemeVarsToDOM(vars: ThemeVars) {
  if (typeof document === "undefined") return;
  const s = document.documentElement.style;
  s.setProperty("--site-primary", vars.primaryColor);
  s.setProperty("--site-secondary", vars.secondaryColor);
  s.setProperty("--site-accent", vars.accentColor);
  s.setProperty("--font-body", vars.fontFamily);
  s.setProperty("--font-heading", vars.headingFontFamily);
}

function ThemeApplicator({ theme }: { theme: ThemeVars }) {
  useEffect(() => {
    applyThemeVarsToDOM(theme);
  }, [theme]);
  return null;
}

export function Providers({
  children,
  darkModeEnabled = true,
  darkModeDefault = false,
  theme,
  nonce,
}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={
        darkModeEnabled ? (darkModeDefault ? "dark" : "system") : "light"
      }
      enableSystem={darkModeEnabled}
      forcedTheme={darkModeEnabled ? undefined : "light"}
      disableTransitionOnChange
      nonce={nonce}
    >
      <SessionProvider>
        <CsrfFetchInterceptor />
        {theme && <ThemeApplicator theme={theme} />}
        {children}
        <ToastContainer />
      </SessionProvider>
    </ThemeProvider>
  );
}
