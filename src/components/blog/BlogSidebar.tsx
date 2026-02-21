import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { Search, Clock, Tag, Archive, FolderOpen } from "lucide-react";
import { AdContainer } from "@/features/ads/ui/AdContainer";

interface SidebarSettings {
  sidebarEnabled: boolean;
  sidebarPosition: string;
  sidebarShowSearch: boolean;
  sidebarShowRecentPosts: boolean;
  sidebarShowCategories: boolean;
  sidebarShowTags: boolean;
  sidebarShowArchive: boolean;
  sidebarRecentPostsCount: number;
}

export async function BlogSidebar({ settings, pageType = "blog-index" }: { settings: SidebarSettings; pageType?: string }) {
  if (!settings.sidebarEnabled) return null;

  // Fetch sidebar data in parallel
  const [recentPosts, tags, archives, categories] = await Promise.all([
    settings.sidebarShowRecentPosts
      ? prisma.post.findMany({
          where: { status: "PUBLISHED", deletedAt: null },
          orderBy: { publishedAt: "desc" },
          take: settings.sidebarRecentPostsCount || 5,
          select: { id: true, title: true, slug: true, publishedAt: true, featuredImage: true },
        })
      : Promise.resolve([]),
    settings.sidebarShowTags
      ? prisma.tag.findMany({
          where: { usageCount: { gt: 0 } },
          orderBy: { usageCount: "desc" },
          take: 20,
          select: { id: true, name: true, slug: true, usageCount: true },
        })
      : Promise.resolve([]),
    settings.sidebarShowArchive
      ? prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
          SELECT TO_CHAR("publishedAt", 'YYYY-MM') as month, COUNT(*)::bigint as count
          FROM posts
          WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL AND "publishedAt" IS NOT NULL
          GROUP BY TO_CHAR("publishedAt", 'YYYY-MM')
          ORDER BY month DESC
          LIMIT 12
        `
      : Promise.resolve([]),
    settings.sidebarShowCategories
      ? prisma.category.findMany({
          where: { postCount: { gt: 0 } },
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, slug: true, color: true, postCount: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <aside className="space-y-6">
      {/* Search */}
      {settings.sidebarShowSearch && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Search className="h-4 w-4" /> Search
          </h3>
          <form action="/blog" method="GET">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                name="q"
                placeholder="Search articles..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </form>
        </div>
      )}

      {/* Recent Posts */}
      {settings.sidebarShowRecentPosts && recentPosts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Clock className="h-4 w-4" /> Recent Posts
          </h3>
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex items-start gap-3"
              >
                {post.featuredImage && (
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                    <Image src={post.featuredImage} alt="" className="h-full w-full object-cover" width={48} height={48} unoptimized />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-primary dark:text-white">
                    {post.title}
                  </p>
                  {post.publishedAt && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tag Cloud */}
      {settings.sidebarShowTags && tags.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Tag className="h-4 w-4" /> Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog?tag=${tag.slug}`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary dark:border-gray-600 dark:text-gray-400"
              >
                {tag.name}
                <span className="text-gray-400 dark:text-gray-500">{tag.usageCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {settings.sidebarShowCategories && categories.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <FolderOpen className="h-4 w-4" /> Categories
          </h3>
          <ul className="space-y-1.5">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/blog?category=${cat.slug}`}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <span className="flex items-center gap-2">
                    {cat.color && (
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                    {cat.name}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500">{cat.postCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Archive */}
      {settings.sidebarShowArchive && archives.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Archive className="h-4 w-4" /> Archive
          </h3>
          <ul className="space-y-1.5">
            {archives.map((a) => {
              const [year, month] = a.month.split("-");
              const label = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
              });
              return (
                <li key={a.month}>
                  <Link
                    href={`/blog?archive=${a.month}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-gray-400">{Number(a.count)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {/* Sidebar Ad Slot */}
      <AdContainer position="SIDEBAR" pageType={pageType} showPlaceholder />

      {/* Sticky Sidebar Ad */}
      <div className="sticky top-24">
        <AdContainer position="SIDEBAR_STICKY" pageType={pageType} />
      </div>
    </aside>
  );
}
