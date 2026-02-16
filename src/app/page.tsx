import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import type { Metadata } from "next";
import type { PostListItem, TagDetail } from "@/types/prisma-helpers";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

export const revalidate = 900; // ISR: rebuild at most every 15 minutes

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst();
  const siteName = settings?.siteName || "MyBlog";
  const description = settings?.siteDescription || "A modern blog platform built with Next.js";
  const ogImage = (settings as Record<string, unknown>)?.seoDefaultImage as string | null;

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
    },
  });
}

async function getPopularTags() {
  return prisma.tag.findMany({
    orderBy: { usageCount: "desc" },
    take: 12,
  });
}

export default async function HomePage() {
  const [posts, featured, tags, settings] = await Promise.all([
    getLatestPosts() as Promise<PostListItem[]>,
    getFeaturedPost() as Promise<PostListItem | null>,
    getPopularTags() as Promise<TagDetail[]>,
    prisma.siteSettings.findFirst(),
  ]);

  const siteName = settings?.siteName || "MyBlog";
  const siteDescription = settings?.siteDescription || "Exploring ideas, sharing knowledge, and building things. Dive into articles on technology, development, and more.";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
          Welcome to <span className="text-blue-600">{siteName}</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500 dark:text-gray-400">
          {siteDescription}
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
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
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-blue-600">
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
                <div className="flex aspect-video items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
                  <span className="text-6xl font-bold text-white/30">Featured</span>
                </div>
              )}
              <div className="flex flex-col justify-center p-8">
                <div className="mb-3 flex flex-wrap gap-2">
                  {featured.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag.id} variant="info">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
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
                      ? new Date(featured.publishedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Latest Articles</h2>
          <Link
            href="/blog"
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
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
                  <div className="flex aspect-video items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                    <span className="text-3xl font-bold text-gray-300 dark:text-gray-500">
                      {post.title.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag.id} variant="default">
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
                      {post.excerpt}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{post.author?.displayName || post.author?.username}</span>
                    <span>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
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

      {/* Tags Cloud */}
      {tags.length > 0 && (
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Popular Tags</h2>
            <Link
              href="/tags"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              All tags <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
              >
                <Tag className="h-3.5 w-3.5" />
                {tag.name}
                <span className="text-xs text-gray-400">({tag.usageCount})</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
