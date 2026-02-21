import Link from "next/link";
import { prisma } from "@/server/db/prisma";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PostNavigationProps {
  currentPostId: string;
  publishedAt: Date | null;
}

export async function PostNavigation({ currentPostId, publishedAt }: PostNavigationProps) {
  if (!publishedAt) return null;

  const [prevPost, nextPost] = await Promise.all([
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        publishedAt: { lt: publishedAt },
        id: { not: currentPostId },
      },
      orderBy: { publishedAt: "desc" },
      select: { title: true, slug: true },
    }),
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        publishedAt: { gt: publishedAt },
        id: { not: currentPostId },
      },
      orderBy: { publishedAt: "asc" },
      select: { title: true, slug: true },
    }),
  ]);

  if (!prevPost && !nextPost) return null;

  return (
    <nav className="mt-10 grid gap-4 sm:grid-cols-2">
      {prevPost ? (
        <Link
          href={`/blog/${prevPost.slug}`}
          className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-gray-700"
        >
          <ChevronLeft className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Previous</p>
            <p className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-primary dark:text-white">
              {prevPost.title}
            </p>
          </div>
        </Link>
      ) : (
        <div />
      )}
      {nextPost ? (
        <Link
          href={`/blog/${nextPost.slug}`}
          className="group flex items-center justify-end gap-3 rounded-xl border border-gray-200 p-4 text-right transition-colors hover:border-primary/30 hover:bg-primary/5 dark:border-gray-700"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Next</p>
            <p className="line-clamp-1 text-sm font-semibold text-gray-900 group-hover:text-primary dark:text-white">
              {nextPost.title}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-primary" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
