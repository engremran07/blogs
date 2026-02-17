import type { Metadata } from "next";
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

export async function generateMetadata(): Promise<Metadata> {
  let siteName = "MyBlog";
  let description = "A modern blog platform built with Next.js";
  let ogImage: string | null = null;
  let googleVerification: string | null = null;
  let bingVerification: string | null = null;
  try {
    const s = await siteSettingsService.getSettings();
    siteName = s.siteName || siteName;
    description = s.siteDescription || description;
    const raw = s as unknown as Record<string, unknown>;
    ogImage = raw.seoDefaultImage as string | null;
    googleVerification = raw.seoGoogleVerification as string | null;
    bingVerification = raw.seoBingVerification as string | null;
  } catch {
    /* fallback to defaults */
  }
  return {
    title: { default: siteName, template: `%s | ${siteName}` },
    description,
    metadataBase: new URL(SITE_URL),
    alternates: { canonical: SITE_URL },
    ...(googleVerification || bingVerification ? {
      verification: {
        ...(googleVerification ? { google: googleVerification } : {}),
        ...(bingVerification ? { other: { 'msvalidate.01': bingVerification } } : {}),
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd) }}
        />
        <Providers>
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
