import { prisma } from "@/server/db/prisma";
import { notFound } from "next/navigation";
import {
  buildWebPageJsonLd,
  serializeJsonLd,
} from "@/features/seo/server/json-ld.util";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import type { Metadata } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export const revalidate = 86400; // ISR: rebuild at most once per day

/**
 * Slugs already handled by dedicated route directories.
 * These must NOT be caught by this dynamic route.
 */
const RESERVED_ROUTES = new Set([
  "about",
  "admin",
  "blog",
  "contact",
  "login",
  "profile",
  "register",
  "search",
  "tags",
  "api",
]);

/* generateStaticParams — pre-render known CMS pages at build time */
export async function generateStaticParams() {
  const pages = await prisma.page.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      slug: { notIn: [...RESERVED_ROUTES] },
    },
    select: { slug: true },
  });

  return pages.map((p) => ({ slug: p.slug }));
}

/* Metadata for SEO */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (RESERVED_ROUTES.has(slug)) return {};

  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      title: true,
      metaTitle: true,
      metaDescription: true,
      excerpt: true,
      ogTitle: true,
      ogDescription: true,
      ogImage: true,
      canonicalUrl: true,
      noIndex: true,
      noFollow: true,
    },
  });

  if (!page) return {};

  const settings = await prisma.siteSettings.findFirst({
    select: { siteName: true },
  });
  const siteName = settings?.siteName || "MyBlog";
  const title = page.metaTitle || page.title;
  const description =
    page.metaDescription || page.excerpt || `${page.title} — ${siteName}`;

  return {
    title,
    description,
    alternates: {
      canonical: page.canonicalUrl || `${SITE_URL}/${slug}`,
    },
    robots: {
      index: !page.noIndex,
      follow: !page.noFollow,
    },
    openGraph: {
      title: page.ogTitle || title,
      description: page.ogDescription || description,
      url: `${SITE_URL}/${slug}`,
      type: "website",
      siteName,
      locale: "en_US",
      ...(page.ogImage
        ? {
            images: [
              { url: page.ogImage, width: 1200, height: 630, alt: title },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary",
      title: page.ogTitle || title,
      description: page.ogDescription || description,
      ...(page.ogImage ? { images: [page.ogImage] } : {}),
    },
  };
}

/* ────────────────────────────── Page Component ────────────────────────────── */

export default async function CmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Guard against reserved routes (shouldn't reach here, but safety net)
  if (RESERVED_ROUTES.has(slug)) notFound();

  const page = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: {
      title: true,
      content: true,
      excerpt: true,
      metaTitle: true,
      featuredImage: true,
      featuredImageAlt: true,
      customCss: true,
      customHead: true,
      updatedAt: true,
      author: { select: { displayName: true, username: true } },
    },
  });

  if (!page) notFound();

  const settings = await prisma.siteSettings.findFirst({
    select: { siteName: true },
  });
  const siteName = settings?.siteName || "MyBlog";

  const jsonLd = buildWebPageJsonLd({
    name: page.metaTitle || page.title,
    url: `${SITE_URL}/${slug}`,
    description: page.excerpt || undefined,
    isPartOf: { name: siteName, url: SITE_URL },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      {page.customCss && <style dangerouslySetInnerHTML={{ __html: page.customCss }} />}

      {/* Page Header */}
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          {page.title}
        </h1>
        {page.excerpt && (
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
            {page.excerpt}
          </p>
        )}
        {page.updatedAt && (
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            Last updated:{" "}
            {new Date(page.updatedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </header>

      {/* Page Content */}
      <article className="prose prose-lg mx-auto max-w-none dark:prose-invert prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 dark:prose-headings:text-white dark:prose-p:text-gray-400 dark:prose-a:text-blue-400">
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </article>

      {/* In-Content Ad */}
      <div className="mt-12">
        <AdContainer position="IN_CONTENT" pageType={slug} />
      </div>
    </div>
  );
}
