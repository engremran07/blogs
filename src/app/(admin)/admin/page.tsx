import { prisma } from "@/server/db/prisma";
import {
  FileText,
  MessageSquare,
  Users,
  Eye,
  Image,
  Search,
  AlertTriangle,
  CheckCircle,
  Link2,
  RefreshCw,
  BarChart3,
  FilePlus2,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    postCount,
    publishedCount,
    draftCount,
    scheduledCount,
    _commentCount,
    pendingComments,
    userCount,
    totalViews,
    mediaCount,
    // SEO health stats
    postsNoSeoTitle,
    postsNoSeoDesc,
    postsNoImage,
    pagesNoMetaTitle,
    pagesNoMetaDesc,
    seoSuggestionsNew,
    seoKeywords,
    seoRedirects,
    redirectHits,
    tagCount,
    pageCount,
    publishedPageCount,
    // Analytics queries
    postsThisWeek,
    postsThisMonth,
    _pageViews,
  ] = await Promise.all([
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.post
      .count({ where: { status: "SCHEDULED", deletedAt: null } })
      .catch(() => 0),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.user.count(),
    prisma.post.aggregate({
      _sum: { viewCount: true },
      where: { deletedAt: null },
    }),
    prisma.media.count({ where: { deletedAt: null } }).catch(() => 0),
    // SEO health queries
    prisma.post
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ seoTitle: null }, { seoTitle: "" }],
        },
      })
      .catch(() => 0),
    prisma.post
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ seoDescription: null }, { seoDescription: "" }],
        },
      })
      .catch(() => 0),
    prisma.post
      .count({
        where: { status: "PUBLISHED", deletedAt: null, featuredImage: null },
      })
      .catch(() => 0),
    prisma.page
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ metaTitle: null }, { metaTitle: "" }],
        },
      })
      .catch(() => 0),
    prisma.page
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          OR: [{ metaDescription: null }, { metaDescription: "" }],
        },
      })
      .catch(() => 0),
    prisma.seoSuggestion.count({ where: { status: "NEW" } }).catch(() => 0),
    prisma.seoKeyword.count().catch(() => 0),
    prisma.seoRedirect.count({ where: { isActive: true } }).catch(() => 0),
    prisma.seoRedirect
      .aggregate({ _sum: { hitCount: true }, where: { isActive: true } })
      .catch(() => ({ _sum: { hitCount: 0 } })),
    prisma.tag.count().catch(() => 0),
    prisma.page.count({ where: { deletedAt: null } }).catch(() => 0),
    prisma.page
      .count({ where: { status: "PUBLISHED", deletedAt: null } })
      .catch(() => 0),
    // Analytics
    prisma.post
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          publishedAt: { gte: weekAgo },
        },
      })
      .catch(() => 0),
    prisma.post
      .count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          publishedAt: { gte: monthAgo },
        },
      })
      .catch(() => 0),
    prisma.page
      .aggregate({
        _sum: { wordCount: true },
        where: { deletedAt: null },
      })
      .catch(() => ({ _sum: { wordCount: 0 } })),
  ]);

  // Recently updated content (posts + pages merged, ordered by updatedAt)
  const [recentlyUpdatedPosts, recentlyUpdatedPages] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        postNumber: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
        viewCount: true,
      },
    }),
    prisma.page.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  // Merge and sort by updatedAt
  const recentlyUpdated = [
    ...recentlyUpdatedPosts.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      updatedAt: p.updatedAt,
      type: "post" as const,
      href: `/admin/posts/${p.postNumber}/edit`,
      viewCount: p.viewCount,
    })),
    ...recentlyUpdatedPages.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      updatedAt: p.updatedAt,
      type: "page" as const,
      href: `/admin/pages/${p.slug}/edit`,
      viewCount: 0,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 10);

  const stats = [
    {
      label: "Total Posts",
      value: postCount,
      icon: FileText,
      color: "blue",
      sub: `${publishedCount} published, ${draftCount} drafts`,
    },
    {
      label: "Total Pages",
      value: pageCount,
      icon: FilePlus2,
      color: "indigo",
      sub: `${publishedPageCount} published`,
    },
    {
      label: "Total Views",
      value: totalViews._sum.viewCount || 0,
      icon: Eye,
      color: "amber",
      sub: "all time",
    },
    {
      label: "Users",
      value: userCount,
      icon: Users,
      color: "purple",
      sub: "registered",
    },
    {
      label: "Media Files",
      value: mediaCount,
      icon: Image,
      color: "cyan",
      sub: "in library",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  const statusColors: Record<string, string> = {
    PUBLISHED:
      "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    SCHEDULED:
      "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary",
    ARCHIVED:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  };

  function timeAgo(date: Date) {
    const seconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of your blog
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-4">
              <div className={`rounded-lg p-2.5 ${colorMap[stat.color]}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Publishing Analytics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-50 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {postsThisWeek}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Published this week
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {postsThisMonth}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Published this month
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {scheduledCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Scheduled posts
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {pendingComments}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pending comments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Health */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              SEO Health
            </h2>
          </div>
          <Link
            href="/admin/seo"
            className="text-sm text-primary hover:underline dark:text-primary"
          >
            Full audit
          </Link>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Missing SEO Titles */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-lg p-2 ${postsNoSeoTitle + pagesNoMetaTitle > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}
            >
              {postsNoSeoTitle + pagesNoMetaTitle > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                SEO Titles
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {postsNoSeoTitle + pagesNoMetaTitle > 0
                  ? `${postsNoSeoTitle} posts, ${pagesNoMetaTitle} pages missing`
                  : "All content has SEO titles"}
              </p>
            </div>
          </div>
          {/* Missing SEO Descriptions */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-lg p-2 ${postsNoSeoDesc + pagesNoMetaDesc > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}
            >
              {postsNoSeoDesc + pagesNoMetaDesc > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Meta Descriptions
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {postsNoSeoDesc + pagesNoMetaDesc > 0
                  ? `${postsNoSeoDesc} posts, ${pagesNoMetaDesc} pages missing`
                  : "All content has descriptions"}
              </p>
            </div>
          </div>
          {/* Missing Featured Images */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-lg p-2 ${postsNoImage > 0 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}
            >
              {postsNoImage > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Featured Images
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {postsNoImage > 0
                  ? `${postsNoImage} published posts missing`
                  : "All posts have images"}
              </p>
            </div>
          </div>
          {/* SEO Suggestions */}
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-lg p-2 ${seoSuggestionsNew > 0 ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"}`}
            >
              {seoSuggestionsNew > 0 ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Suggestions
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {seoSuggestionsNew > 0
                  ? `${seoSuggestionsNew} new suggestions`
                  : "No pending suggestions"}
              </p>
            </div>
          </div>
        </div>
        {/* SEO Quick Stats Bar */}
        <div className="flex items-center gap-6 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Link2 className="h-3.5 w-3.5" /> {seoRedirects} active redirects (
            {(redirectHits as { _sum: { hitCount: number | null } })._sum
              .hitCount ?? 0}{" "}
            hits)
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {seoKeywords} tracked keywords
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tagCount} tags &middot; {pageCount} pages
          </span>
        </div>
      </div>

      {/* Recently Updated Content */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary dark:text-primary" />
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Recently Updated
            </h2>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/posts"
              className="text-sm text-primary hover:underline dark:text-primary"
            >
              All posts
            </Link>
            <Link
              href="/admin/pages"
              className="text-sm text-primary hover:underline dark:text-primary"
            >
              All pages
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {recentlyUpdated.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                    item.type === "post"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                      : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  }`}
                >
                  {item.type}
                </span>
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {item.title}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {item.type === "post" && item.viewCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="h-3 w-3" /> {item.viewCount}
                  </span>
                )}
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[item.status] || ""}`}
                >
                  {item.status}
                </span>
                <span className="w-16 text-right text-xs text-gray-400">
                  {timeAgo(item.updatedAt)}
                </span>
              </div>
            </Link>
          ))}
          {recentlyUpdated.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              No content yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
