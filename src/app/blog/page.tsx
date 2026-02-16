import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { Calendar, Clock, Search, Eye, User } from "lucide-react";
import { Badge } from "@/components/ui/Card";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { PostCardShareOverlay } from "@/components/blog/PostCardShareOverlay";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import { InFeedAdCard } from "@/features/ads/ui/InFeedAdCard";
import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst({ select: { siteName: true, siteDescription: true } });
  const siteName = settings?.siteName || "MyBlog";

  return {
    title: "Blog",
    description: `Browse all blog posts and articles on ${siteName}`,
    alternates: { canonical: `${SITE_URL}/blog` },
    openGraph: {
      title: `Blog | ${siteName}`,
      description: `Browse all blog posts and articles on ${siteName}`,
      url: `${SITE_URL}/blog`,
      type: "website",
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: `Blog | ${siteName}`,
      description: `Browse all blog posts and articles on ${siteName}`,
    },
  };
}

export const revalidate = 600; // ISR: rebuild at most every 10 minutes

interface BlogPageProps {
  searchParams: Promise<{ page?: string; tag?: string; category?: string; q?: string; archive?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const settings = await prisma.siteSettings.findFirst();
  const page = Number(params.page) || 1;
  const perPage = settings?.postsPerPage || 12;
  const skip = (page - 1) * perPage;

  // Layout settings
  const layout = settings?.blogLayout || "grid";
  const columns = settings?.blogColumns || 2;
  const showAuthor = settings?.showAuthor ?? true;
  const showDate = settings?.showDate ?? true;
  const showReadTime = settings?.showReadTime ?? true;
  const showTags = settings?.showTags ?? true;
  const showFeaturedImage = settings?.showFeaturedImage ?? true;
  const showExcerpt = settings?.showExcerpt ?? true;
  const showViewCount = settings?.showViewCount ?? false;
  const searchEnabled = settings?.enableSearch ?? true;

  const showSocialShare = settings?.socialSharingEnabled ?? true;

  // Sidebar settings
  const sidebarSettings = {
    sidebarEnabled: settings?.sidebarEnabled ?? true,
    sidebarPosition: settings?.sidebarPosition || "right",
    sidebarShowSearch: settings?.sidebarShowSearch ?? true,
    sidebarShowRecentPosts: settings?.sidebarShowRecentPosts ?? true,
    sidebarShowCategories: settings?.sidebarShowCategories ?? true,
    sidebarShowTags: settings?.sidebarShowTags ?? true,
    sidebarShowArchive: settings?.sidebarShowArchive ?? false,
    sidebarRecentPostsCount: settings?.sidebarRecentPostsCount || 5,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "PUBLISHED",
    deletedAt: null,
    ...(params.tag && { tags: { some: { slug: params.tag } } }),
    ...(params.category && { categories: { some: { slug: params.category } } }),
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" } },
        { excerpt: { contains: params.q, mode: "insensitive" } },
        { content: { contains: params.q, mode: "insensitive" } },
      ],
    }),
  };

  // Archive filter
  if (params.archive) {
    const [year, month] = params.archive.split("-").map(Number);
    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      where.publishedAt = { gte: start, lt: end };
    }
  }

  type PostItem = {
    id: string; slug: string; title: string; excerpt: string | null;
    featuredImage: string | null; publishedAt: Date | null; readingTime: number;
    viewCount: number;
    author: { id: string; username: string; displayName: string | null } | null;
    tags: Array<{ id: string; name: string; slug: string }>;
    categories: Array<{ id: string; name: string; slug: string }>;
  };

  const [posts, total]: [PostItem[], number] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: perPage,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        readingTime: true,
        viewCount: true,
        author: { select: { id: true, username: true, displayName: true } },
        tags: { select: { id: true, name: true, slug: true } },
        categories: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.post.count({ where }),
  ]) as [PostItem[], number];

  const totalPages = Math.ceil(total / perPage);

  // Grid class based on layout and columns
  const gridClass =
    layout === "list"
      ? "flex flex-col gap-6"
      : layout === "masonry"
        ? `columns-1 gap-6 space-y-6 ${columns >= 2 ? "sm:columns-2" : ""} ${columns >= 3 ? "lg:columns-3" : ""} ${columns >= 4 ? "xl:columns-4" : ""}`
        : `grid gap-6 ${columns >= 2 ? "sm:grid-cols-2" : ""} ${columns >= 3 ? "lg:grid-cols-3" : ""} ${columns >= 4 ? "xl:grid-cols-4" : ""}`;

  const sidebar = sidebarSettings.sidebarEnabled ? (
    <div className="w-full lg:w-80 shrink-0">
      <BlogSidebar settings={sidebarSettings} pageType="blog-index" />
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Blog</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {total} article{total !== 1 ? "s" : ""}
            {params.q && ` matching "${params.q}"`}
            {params.tag && ` tagged "${params.tag}"`}
            {params.archive && ` from ${params.archive}`}
          </p>
        </div>
        {searchEnabled && (
          <form action="/blog" method="GET" className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="Search articles..."
                className="rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </form>
        )}
      </div>

      {/* Blog + Sidebar Layout */}
      <div className={`flex flex-col gap-8 lg:flex-row ${sidebarSettings.sidebarPosition === "left" ? "lg:flex-row-reverse" : ""}`}>
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 py-16 text-center dark:border-gray-700">
              <Search className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No articles found</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try a different search or browse all posts
              </p>
              <Link
                href="/blog"
                className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View all articles
              </Link>
            </div>
          ) : layout === "list" ? (
            /* ── List Layout ── */
            <div className={gridClass}>
              {posts.map((post, idx) => (
                <div key={post.id}>
                  <div className="group relative">
                    {showSocialShare && <PostCardShareOverlay slug={post.slug} title={post.title} />}
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:flex-row"
                  >
                  {showFeaturedImage && post.featuredImage ? (
                    <div className="relative h-48 w-full overflow-hidden bg-gray-100 sm:h-auto sm:w-56 shrink-0 dark:bg-gray-700">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 224px"
                      />
                    </div>
                  ) : showFeaturedImage ? (
                    <div className="flex h-48 w-full items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 sm:h-auto sm:w-56 shrink-0 dark:from-gray-700 dark:to-gray-600">
                      <span className="text-3xl font-bold text-gray-300 dark:text-gray-500">
                        {post.title.charAt(0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                    {showTags && post.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag.id} variant="default">{tag.name}</Badge>
                        ))}
                      </div>
                    )}
                    <h2 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {post.title}
                    </h2>
                    {showExcerpt && post.excerpt && (
                      <p className="mt-2 line-clamp-3 flex-1 text-sm text-gray-600 dark:text-gray-400">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {showAuthor && post.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.author.displayName || post.author.username}
                        </span>
                      )}
                      {showDate && post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {showReadTime && post.readingTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min
                        </span>
                      )}
                      {showViewCount && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.viewCount.toLocaleString()} views
                        </span>
                      )}
                    </div>
                  </div>
                  </Link>
                </div>
                  {/* In-feed ad every 4 posts */}
                  {(idx + 1) % 4 === 0 && idx < posts.length - 1 && (
                    <InFeedAdCard layout="list" pageType="blog-index" index={idx} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* ── Grid / Masonry Layout ── */
            <div className={gridClass}>
              {posts.map((post, idx) => (
                <Fragment key={post.id}>
                <div className={`group relative ${layout === "masonry" ? "break-inside-avoid" : ""}`}>
                  {showSocialShare && <PostCardShareOverlay slug={post.slug} title={post.title} />}
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
                >
                  {showFeaturedImage && post.featuredImage ? (
                    <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : showFeaturedImage ? (
                    <div className="flex aspect-video items-center justify-center bg-linear-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600">
                      <span className="text-3xl font-bold text-gray-300 dark:text-gray-500">
                        {post.title.charAt(0)}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col p-5">
                    {showTags && post.tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag.id} variant="default">{tag.name}</Badge>
                        ))}
                      </div>
                    )}
                    <h2 className="line-clamp-2 text-lg font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                      {post.title}
                    </h2>
                    {showExcerpt && post.excerpt && (
                      <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600 dark:text-gray-400">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {showAuthor && post.author && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {post.author.displayName || post.author.username}
                        </span>
                      )}
                      {showDate && post.publishedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      )}
                      {showReadTime && post.readingTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {post.readingTime} min
                        </span>
                      )}
                      {showViewCount && (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {post.viewCount.toLocaleString()} views
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                </div>
                {/* In-feed ad every 4 posts in grid/masonry */}
                {(idx + 1) % 4 === 0 && idx < posts.length - 1 && (
                  <InFeedAdCard key={`ad-${idx}`} layout={layout as "grid" | "masonry"} pageType="blog-index" index={idx} />
                )}
                </Fragment>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/blog?page=${page - 1}${params.q ? `&q=${params.q}` : ""}${params.tag ? `&tag=${params.tag}` : ""}${params.archive ? `&archive=${params.archive}` : ""}`}
                  rel="prev"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Previous
                </Link>
              )}
              <span className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/blog?page=${page + 1}${params.q ? `&q=${params.q}` : ""}${params.tag ? `&tag=${params.tag}` : ""}${params.archive ? `&archive=${params.archive}` : ""}`}
                  rel="next"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Next
                </Link>
              )}
            </nav>
          )}

          {/* In-Feed Ad */}
          <div className="mt-6">
            <AdContainer position="IN_FEED" pageType="blog-index" />
          </div>
        </div>

        {/* Sidebar */}
        {sidebar}
      </div>
    </div>
  );
}
