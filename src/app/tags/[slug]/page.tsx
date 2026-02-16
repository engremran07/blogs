import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { Calendar, Eye, Clock, ArrowLeft, Tag as TagIcon } from "lucide-react";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import type { PostListItem, TagDetail } from "@/types/prisma-helpers";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

export const revalidate = 3600; // ISR: rebuild at most every hour

/** Pre-render all tag slugs at build time */
export async function generateStaticParams() {
  const tags = await prisma.tag.findMany({
    select: { slug: true },
    take: 500,
  });
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, settings] = await Promise.all([
    prisma.tag.findUnique({ where: { slug } }),
    prisma.siteSettings.findFirst({ select: { siteName: true } }),
  ]);
  if (!tag) return { title: "Tag Not Found" };

  const siteName = settings?.siteName || "MyBlog";
  const title = tag.metaTitle || `Posts tagged "${tag.name}"`;
  const description = tag.metaDescription || tag.description || `All articles tagged with ${tag.name}`;
  const pageUrl = `${SITE_URL}/tags/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: `${title} | ${siteName}`,
      description,
      url: pageUrl,
      type: "website",
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary" as const,
      title: `${title} | ${siteName}`,
      description,
    },
  };
}

export default async function TagDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr || "1", 10));
  const perPage = 12;

  const tag = await prisma.tag.findUnique({ where: { slug } }) as TagDetail | null;
  if (!tag) notFound();

  const postWhere = { status: "PUBLISHED" as const, deletedAt: null, tags: { some: { id: tag.id } } };

  const posts = await prisma.post.findMany({
    where: postWhere,
    orderBy: { publishedAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
    include: {
      author: { select: { id: true, username: true, displayName: true } },
      tags: { select: { id: true, name: true, slug: true, color: true } },
    },
  }) as PostListItem[];

  const total = await prisma.post.count({ where: postWhere });

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back to Tags */}
      <Link
        href="/tags"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> All Tags
      </Link>

      {/* Tag Header */}
      <div className="mb-10 rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl text-xl font-bold"
            style={{ backgroundColor: (tag.color || "#3b82f6") + "20", color: tag.color || "#3b82f6" }}
          >
            {tag.icon || <TagIcon className="h-7 w-7" />}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tag.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {total} {total === 1 ? "article" : "articles"}
            </p>
          </div>
        </div>
        {tag.description && (
          <p className="mt-4 text-gray-600 dark:text-gray-400">{tag.description}</p>
        )}
      </div>

      {/* In-Feed Ad */}
      <div className="mb-8">
        <AdContainer position="IN_FEED" pageType={`tag:${slug}`} />
      </div>

      {/* Posts Grid */}
      {posts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-xl border border-gray-200 bg-white transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
            >
              {post.featuredImage && (
                <div className="relative aspect-video overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-700">
                  <Image
                    src={post.featuredImage}
                    alt={post.featuredImageAlt || post.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <div className="p-5">
                <h2 className="mb-2 font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400 line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Draft"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {post.viewCount}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-gray-500 dark:text-gray-400">
          No published articles with this tag yet.
        </p>
      )}

      {/* In-Content Ad */}
      <div className="mt-8">
        <AdContainer position="IN_CONTENT" pageType={`tag:${slug}`} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/tags/${slug}?page=${page - 1}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Previous
            </Link>
          )}
          <span className="flex items-center px-4 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/tags/${slug}?page=${page + 1}`}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
