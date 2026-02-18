import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { PublicShell } from "@/components/layout/PublicShell";
import { HeaderAdBanner, FooterAdBanner, OverlayAdSlots } from "@/features/ads/ui/GlobalAdSlots";
import { siteSettingsService } from "@/server/wiring";
import { serializeJsonLd } from "@/features/seo/server/json-ld.util";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ── Google Fonts helper ── */
const GOOGLE_FONT_NAMES = new Set([
  "Inter", "Roboto", "Open Sans", "Lato", "Poppins",
  "Nunito", "Merriweather", "Playfair Display", "Montserrat",
]);

function extractGoogleFontName(css: string): string | null {
  const m = css.match(/^['"]?([^'",]+)/);
  const name = m?.[1]?.trim();
  return name && GOOGLE_FONT_NAMES.has(name) ? name : null;
}

function buildGoogleFontsUrl(
  ...families: (string | null | undefined)[]
): string | null {
  const names = families
    .filter(Boolean)
    .map((f) => extractGoogleFontName(f!))
    .filter((n): n is string => n !== null);
  const unique = [...new Set(names)];
  if (unique.length === 0) return null;
  const params = unique
    .map((n) => `family=${encodeURIComponent(n)}:wght@300;400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export async function generateViewport(): Promise<Viewport> {
  let themeColor: string | null = null;
  try {
    const s = await siteSettingsService.getSettings();
    themeColor = s.themeColor || s.primaryColor || null;
  } catch {
    /* fallback */
  }
  return {
    ...(themeColor ? { themeColor } : {}),
  };
}

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "MyBlog";
  let description = "A modern blog platform built with Next.js";
  let ogImage: string | null = null;
  let googleVerification: string | null = null;
  let bingVerification: string | null = null;
  let yandexVerification: string | null = null;
  let pinterestVerification: string | null = null;
  let baiduVerification: string | null = null;
  let titleTemplate = `%s | ${siteName}`;
  let faviconUrl = "/favicon.ico";
  try {
    const s = await siteSettingsService.getSettings();
    siteName = s.siteName || siteName;
    description = s.siteDescription || description;
    faviconUrl = s.faviconUrl || faviconUrl;
    const raw = s as unknown as Record<string, unknown>;
    ogImage = (raw.seoDefaultImage as string) || null;
    googleVerification = (raw.seoGoogleVerification as string) || null;
    bingVerification = (raw.seoBingVerification as string) || null;
    yandexVerification = (raw.seoYandexVerification as string) || null;
    pinterestVerification = (raw.seoPinterestVerification as string) || null;
    baiduVerification = (raw.seoBaiduVerification as string) || null;
    // Use admin-configured title template if set (e.g. "%s — MySite")
    const customTemplate = raw.seoTitleTemplate as string | null;
    if (customTemplate && customTemplate.includes("%s")) {
      titleTemplate = customTemplate.replace(/%siteName%/g, siteName);
    } else {
      titleTemplate = `%s | ${siteName}`;
    }
  } catch {
    /* fallback to defaults */
  }

  // Build verification object with all supported engines
  const verification: Record<string, string> = {};
  if (googleVerification) verification.google = googleVerification;
  if (bingVerification) verification["msvalidate.01"] = bingVerification;
  if (yandexVerification) verification["yandex-verification"] = yandexVerification;
  if (pinterestVerification) verification["p:domain_verify"] = pinterestVerification;
  if (baiduVerification) verification["baidu-site-verification"] = baiduVerification;

  return {
    title: { default: siteName, template: titleTemplate },
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: SITE_URL },
    icons: { icon: faviconUrl },
    ...(Object.keys(verification).length > 0 ? {
      verification: {
        ...(googleVerification ? { google: googleVerification } : {}),
        ...(Object.keys(verification).length > 1 ? {
          other: Object.fromEntries(
            Object.entries(verification).filter(([k]) => k !== "google")
          ),
        } : {}),
      },
    } : {}),
    openGraph: {
      type: "website",
      siteName,
      locale: "en_US",
      description,
      url: SITE_URL,
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

async function getWebSiteJsonLd() {
  let siteName = "MyBlog";
  let description = "A modern blog platform built with Next.js";
  try {
    const s = await siteSettingsService.getSettings();
    siteName = s.siteName || siteName;
    description = s.siteDescription || description;
  } catch {
    /* fallback to defaults */
  }
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: SITE_URL,
    description,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const webSiteJsonLd = await getWebSiteJsonLd();

  /* ── Appearance settings ── */
  let primaryColor = "#3b82f6";
  let secondaryColor = "#64748b";
  let accentColor = "#f59e0b";
  let fontFamily = "system-ui, sans-serif";
  let headingFontFamily: string | null = null;
  let customCss: string | null = null;
  let darkModeEnabled = true;
  let darkModeDefault = false;

  try {
    const s = await siteSettingsService.getSettings();
    primaryColor = s.primaryColor || primaryColor;
    secondaryColor = s.secondaryColor || secondaryColor;
    accentColor = s.accentColor || accentColor;
    fontFamily = s.fontFamily || fontFamily;
    headingFontFamily = s.headingFontFamily ?? null;
    customCss = s.customCss ?? null;
    darkModeEnabled = s.darkModeEnabled ?? true;
    darkModeDefault = s.darkModeDefault ?? false;
  } catch {
    /* fallback to defaults */
  }

  const effectiveHeadingFont = headingFontFamily || fontFamily;
  const googleFontsUrl = buildGoogleFontsUrl(fontFamily, headingFontFamily);

  const themeCssVars = `:root{--site-primary:${primaryColor};--site-secondary:${secondaryColor};--site-accent:${accentColor};--font-body:${fontFamily};--font-heading:${effectiveHeadingFont}}`;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme CSS variable overrides from admin settings */}
        <style dangerouslySetInnerHTML={{ __html: themeCssVars }} />
        {/* Google Fonts for admin-selected typography */}
        {googleFontsUrl && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link rel="stylesheet" href={googleFontsUrl} />
          </>
        )}
        {/* Admin custom CSS */}
        {customCss && (
          <style dangerouslySetInnerHTML={{ __html: customCss }} />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd) }}
        />
        <Providers darkModeEnabled={darkModeEnabled} darkModeDefault={darkModeDefault}>
          <PublicShell
            headerAdSlot={<HeaderAdBanner />}
            footerAdSlot={<FooterAdBanner />}
            overlayAdSlot={<OverlayAdSlots />}
          >
            {children}
          </PublicShell>
        </Providers>
      </body>
    </html>
  );
}
