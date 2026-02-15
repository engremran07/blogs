import { prisma } from "@/server/db/prisma";
import { FileText, MessageSquare, Users, Eye, TrendingUp, Clock, Image } from "lucide-react";
import Link from "next/link";
import type { AdminPostItem, AdminCommentItem } from "@/types/prisma-helpers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const [
    postCount,
    publishedCount,
    draftCount,
    commentCount,
    pendingComments,
    userCount,
    totalViews,
    mediaCount,
  ] = await Promise.all([
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.user.count(),
    prisma.post.aggregate({ _sum: { viewCount: true }, where: { deletedAt: null } }),
    prisma.media.count({ where: { deletedAt: null } }).catch(() => 0),
  ]);

  const recentPosts = await prisma.post.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, slug: true, status: true, createdAt: true, viewCount: true },
  }) as AdminPostItem[];

  const recentComments = await prisma.comment.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true, content: true, authorName: true, status: true, createdAt: true,
      post: { select: { title: true, slug: true } },
    },
  }) as AdminCommentItem[];

  const stats = [
    { label: "Total Posts", value: postCount, icon: FileText, color: "blue", sub: `${publishedCount} published, ${draftCount} drafts` },
    { label: "Comments", value: commentCount, icon: MessageSquare, color: "green", sub: `${pendingComments} pending` },
    { label: "Users", value: userCount, icon: Users, color: "purple", sub: "registered" },
    { label: "Total Views", value: totalViews._sum.viewCount || 0, icon: Eye, color: "amber", sub: "all time" },
    { label: "Media Files", value: mediaCount, icon: Image, color: "cyan", sub: "in library" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    cyan: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  const statusColors: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
    SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    ARCHIVED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    SPAM: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">Overview of your blog</p>
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
                  {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Posts */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Posts</h2>
            <Link
              href="/admin/posts"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentPosts.map((post) => (
              <Link
                key={post.id}
                href={`/admin/posts/${post.id}/edit`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {post.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Eye className="h-3 w-3" /> {post.viewCount}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[post.status] || ""}`}
                  >
                    {post.status}
                  </span>
                </div>
              </Link>
            ))}
            {recentPosts.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-500">No posts yet</p>
            )}
          </div>
        </div>

        {/* Recent Comments */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Comments</h2>
            <Link
              href="/admin/comments"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentComments.map((comment) => (
              <div
                key={comment.id}
                className="px-5 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {comment.authorName || "Anonymous"}
                  </p>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[comment.status] || ""}`}
                  >
                    {comment.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                  {comment.content}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  on {comment.post?.title || "Unknown"} &middot;{" "}
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
            {recentComments.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-500">No comments yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/admin/posts/new", label: "Write New Post", icon: FileText },
            { href: "/admin/media", label: "Media Library", icon: Image },
            { href: "/admin/comments", label: `Moderate Comments (${pendingComments})`, icon: MessageSquare },
            { href: "/admin/pages/new", label: "Create New Page", icon: TrendingUp },
            { href: "/admin/settings", label: "Site Settings", icon: Clock },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-900/20"
            >
              <action.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
