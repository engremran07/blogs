import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { PostImageFallback } from "@/components/blog/PostImageFallback";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  serializeJsonLd,
} from "@/features/seo/server/json-ld.util";
import type { Metadata } from "next";
import type { PostListItem } from "@/types/prisma-helpers";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com"
).replace(/\/$/, "");

export const revalidate = 900; // ISR: rebuild at most every 15 minutes

/** Returns the page marked as isHomePage, if any. */
async function getCustomHomePage() {
  return prisma.page.findFirst({
    where: { isHomePage: true, status: "PUBLISHED", deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      metaTitle: true,
      metaDescription: true,
      ogTitle: true,
      ogDescription: true,
      ogImage: true,
      canonicalUrl: true,
      noIndex: true,
      noFollow: true,
      featuredImage: true,
      featuredImageAlt: true,
      customCss: true,
      customHead: true,
      updatedAt: true,
      slug: true,
      author: { select: { displayName: true, username: true } },
    },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const [settings, customPage] = await Promise.all([
    prisma.siteSettings.findFirst(),
    getCustomHomePage(),
  ]);
  const siteName = settings?.siteName || "MyBlog";

  // If a custom home page is set, use its SEO fields
  if (customPage) {
    const title = customPage.metaTitle || customPage.title;
    const description =
      customPage.metaDescription ||
      customPage.excerpt ||
      `${customPage.title} — ${siteName}`;
    const ogImage = customPage.ogImage;

    return {
      title: { absolute: `${title} | ${siteName}` },
      description,
      alternates: {
        canonical: customPage.canonicalUrl || SITE_URL,
      },
      robots: {
        index: !customPage.noIndex,
        follow: !customPage.noFollow,
      },
      openGraph: {
        title: customPage.ogTitle || title,
        description: customPage.ogDescription || description,
        url: SITE_URL,
        type: "website",
        siteName,
        locale: "en_US",
        ...(ogImage
          ? {
              images: [
                { url: ogImage, width: 1200, height: 630, alt: title },
              ],
            }
          : {}),
      },
      twitter: {
        card: "summary_large_image",
        title: customPage.ogTitle || title,
        description: customPage.ogDescription || description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    };
  }

  // Default blog home metadata
  const description =
    settings?.siteDescription || "A modern blog platform built with Next.js";
  const ogImage = (settings as Record<string, unknown>)?.seoDefaultImage as
    | string
    | null;

  return {
    title: { absolute: siteName },
    description,
    alternates: { canonical: SITE_URL },
    openGraph: {
      title: siteName,
      description,
      url: SITE_URL,
      type: "website",
      siteName,
      locale: "en_US",
      ...(ogImage
        ? {
            images: [{ url: ogImage, width: 1200, height: 630, alt: siteName }],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

async function getLatestPosts() {
  return prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { publishedAt: "desc" },
    take: 6,
    include: {
      author: { select: { id: true, username: true, displayName: true } },
      tags: { select: { id: true, name: true, slug: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
  });
}

async function getFeaturedPost() {
  return prisma.post.findFirst({
    where: { status: "PUBLISHED", deletedAt: null, isFeatured: true },
    orderBy: { publishedAt: "desc" },
    include: {
      author: { select: { id: true, username: true, displayName: true } },
      tags: { select: { id: true, name: true, slug: true } },
      categories: { select: { id: true, name: true, slug: true } },
    },
  });
}


export default async function HomePage() {
  // Check if admin has set a custom page as the home page
  const customPage = await getCustomHomePage();

  if (customPage) {
    const settings = await prisma.siteSettings.findFirst({
      select: { siteName: true },
    });
    const siteName = settings?.siteName || "MyBlog";
    const jsonLd = buildWebPageJsonLd({
      name: customPage.metaTitle || customPage.title,
      url: SITE_URL,
      description: customPage.excerpt || undefined,
      isPartOf: { name: siteName, url: SITE_URL },
    });

    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />

        {customPage.customCss && (
          <style dangerouslySetInnerHTML={{ __html: customPage.customCss }} />
        )}

        {/* Page Header */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {customPage.title}
          </h1>
          {customPage.excerpt && (
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
              {customPage.excerpt}
            </p>
          )}
        </header>

        {/* Page Content */}
        <article className="prose prose-lg mx-auto max-w-none dark:prose-invert prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary dark:prose-headings:text-white dark:prose-p:text-gray-400">
          <div dangerouslySetInnerHTML={{ __html: customPage.content }} />
        </article>

        {/* Home Page Ad */}
        <div className="mt-12">
          <AdContainer position="IN_CONTENT" pageType="home" />
        </div>
      </div>
    );
  }

  // ─── Default Blog Home Layout ──────────────────────────────────────────
  const [posts, featured, settings] = await Promise.all([
    getLatestPosts() as Promise<PostListItem[]>,
    getFeaturedPost() as Promise<PostListItem | null>,
    prisma.siteSettings.findFirst(),
  ]);

  const siteName = settings?.siteName || "MyBlog";
  const siteDescription =
    settings?.siteDescription ||
    "Exploring ideas, sharing knowledge, and building things. Dive into articles on technology, development, and more.";
  const s = settings as Record<string, unknown> | null;
  const socialLinks = [
    s?.socialFacebook,
    s?.socialTwitter,
    s?.socialInstagram,
    s?.socialLinkedin,
    s?.socialYoutube,
    s?.socialGithub,
  ].filter(Boolean) as string[];
  const organizationJsonLd = buildOrganizationJsonLd({
    name: siteName,
    url: SITE_URL,
    logoUrl: (s?.logoUrl as string) || undefined,
    description: siteDescription,
    email: (s?.contactEmail as string) || undefined,
    phone: (s?.contactPhone as string) || undefined,
    socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Organization JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(organizationJsonLd),
        }}
      />
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
          Welcome to <span className="text-primary">{siteName}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
          {siteDescription}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
          >
            Browse Articles
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            About Me
          </Link>
        </div>
      </section>

      {/* Featured Post */}
      {featured && (
        <section className="mb-16">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-primary">
            Featured
          </h2>
          <Link
            href={`/blog/${featured.slug}`}
            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="grid md:grid-cols-2">
              {featured.featuredImage ? (
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={featured.featuredImage}
                    alt={featured.featuredImageAlt || featured.title}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority
                  />
                </div>
              ) : (
                <PostImageFallback
                  title={featured.title}
                  category={featured.categories?.[0]?.name}
                  className="aspect-video"
                />
              )}
              <div className="flex flex-col justify-center p-8">
                <div className="mb-3 flex flex-wrap gap-2">
                  {featured.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="info">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-primary dark:text-white">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="mt-3 line-clamp-3 text-gray-600 dark:text-gray-400">
                    {featured.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {featured.publishedAt
                      ? new Date(featured.publishedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "Draft"}
                  </span>
                  {featured.readingTime > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {featured.readingTime} min read
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Latest Posts */}
      <section className="mb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Latest Articles
          </h2>
          <Link
            href="/blog"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 py-16 text-center dark:border-gray-700">
            <p className="text-lg text-gray-500 dark:text-gray-400">
              No posts yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                {post.featuredImage ? (
                  <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <Image
                      src={post.featuredImage}
                      alt={post.featuredImageAlt || post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <PostImageFallback
                    title={post.title}
                    category={post.categories?.[0]?.name}
                    className="aspect-video"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="default">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-primary dark:text-white">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {post.author?.displayName || post.author?.username}
                    </span>
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "Draft"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Home Page Ad */}
      <div className="my-8">
        <AdContainer position="IN_CONTENT" pageType="home" />
      </div>
    </div>
  );
}
