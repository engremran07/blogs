"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { ToastContainer } from "@/components/ui/Toast";
import { CsrfFetchInterceptor } from "@/components/providers/CsrfFetchInterceptor";

interface ProvidersProps {
  children: React.ReactNode;
  darkModeEnabled?: boolean;
  darkModeDefault?: boolean;
}

export function Providers({
  children,
  darkModeEnabled = true,
  darkModeDefault = false,
}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={darkModeEnabled ? (darkModeDefault ? "dark" : "system") : "light"}
      enableSystem={darkModeEnabled}
      forcedTheme={darkModeEnabled ? undefined : "light"}
      disableTransitionOnChange
    >
      <SessionProvider>
        <CsrfFetchInterceptor />
        {children}
        <ToastContainer />
      </SessionProvider>
    </ThemeProvider>
  );
}
