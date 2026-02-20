import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { Tag as TagIcon, TrendingUp, Star } from "lucide-react";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import { buildWebPageJsonLd, serializeJsonLd } from "@/features/seo/server/json-ld.util";
import type { Metadata } from "next";
import type { TagDetail } from "@/types/prisma-helpers";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

export const revalidate = 3600; // ISR: rebuild at most every hour

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst({ select: { siteName: true } });
  const siteName = settings?.siteName || "MyBlog";

  return {
    title: "Tags",
    description: `Browse all tags and topics on ${siteName}`,
    alternates: { canonical: `${SITE_URL}/tags` },
    openGraph: {
      title: `Tags | ${siteName}`,
      description: `Browse all tags and topics on ${siteName}`,
      url: `${SITE_URL}/tags`,
      type: "website",
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: `Tags | ${siteName}`,
      description: `Browse all tags and topics on ${siteName}`,
    },
  };
}

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { usageCount: "desc" },
    take: 100,
  }) as TagDetail[];

  const featured = tags.filter((t) => t.featured);
  const trending = tags.filter((t) => t.trending);
  const regular = tags.filter((t) => !t.featured && !t.trending);

  function sizeClass(count: number) {
    if (count >= 20) return "text-2xl font-bold";
    if (count >= 10) return "text-xl font-semibold";
    if (count >= 5) return "text-lg font-medium";
    return "text-sm";
  }

  const settings = await prisma.siteSettings.findFirst({ select: { siteName: true } });
  const siteName = settings?.siteName || "MyBlog";
  const tagsJsonLd = buildWebPageJsonLd({
    name: `Tags`,
    url: `${SITE_URL}/tags`,
    description: `Browse all tags and topics on ${siteName}`,
    isPartOf: { name: siteName, url: SITE_URL },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(tagsJsonLd) }} />
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          <TagIcon className="h-4 w-4" />
          {tags.length} Tags
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Browse by Tag
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400">
          Explore articles organized by topic
        </p>
      </div>

      {/* Featured Tags */}
      {featured.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <Star className="h-5 w-5 text-yellow-500" /> Featured
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-lg"
                  style={{ backgroundColor: (tag.color || "#3b82f6") + "20", color: tag.color || "#3b82f6" }}
                >
                  {tag.icon || "#"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {tag.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {tag.usageCount} {tag.usageCount === 1 ? "post" : "posts"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
            <TrendingUp className="h-5 w-5 text-green-500" /> Trending
          </h2>
          <div className="flex flex-wrap gap-3">
            {trending.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              >
                {tag.name}
                <span className="rounded bg-green-200 px-1.5 py-0.5 text-xs dark:bg-green-800">
                  {tag.usageCount}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* In-Content Ad */}
      <div className="mb-12">
        <AdContainer position="IN_CONTENT" pageType="tags-index" />
      </div>

      {/* Tag Cloud */}
      <section>
        <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
          All Tags
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          {regular.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className={`rounded-lg px-3 py-1.5 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 ${sizeClass(tag.usageCount)} text-gray-700 dark:text-gray-300`}
            >
              {tag.name}
              <sup className="ml-1 text-xs text-gray-400">{tag.usageCount}</sup>
            </Link>
          ))}
          {regular.length === 0 && featured.length === 0 && trending.length === 0 && (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400 w-full">
              No tags yet. Create your first post to get started!
            </p>
          )}
        </div>
      </section>

      {/* In-Feed Ad — bottom */}
      <div className="mt-10">
        <AdContainer position="IN_FEED" pageType="tags-index" />
      </div>
    </div>
  );
}
