import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { Calendar } from "lucide-react";
import { PostImageFallback } from "@/components/blog/PostImageFallback";

interface RelatedPostsProps {
  postId: string;
  tagIds: string[];
  categoryIds?: string[];
  count?: number;
}

export async function RelatedPosts({
  postId,
  tagIds,
  categoryIds = [],
  count = 3,
}: RelatedPostsProps) {
  if (tagIds.length === 0 && categoryIds.length === 0) return null;

  // Build OR conditions: match by tags or categories
  const orConditions: Record<string, unknown>[] = [];
  if (tagIds.length > 0) {
    orConditions.push({ tags: { some: { id: { in: tagIds } } } });
  }
  if (categoryIds.length > 0) {
    orConditions.push({ categories: { some: { id: { in: categoryIds } } } });
  }

  const posts = await prisma.post.findMany({
    where: {
      id: { not: postId },
      status: "PUBLISHED",
      deletedAt: null,
      OR: orConditions,
    },
    orderBy: { publishedAt: "desc" },
    take: count,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      featuredImage: true,
      publishedAt: true,
      readingTime: true,
      author: { select: { displayName: true, username: true } },
      categories: { select: { id: true, name: true } },
    },
  });

  if (posts.length === 0) return null;

  return (
    <section className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Related Posts
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ) : (
              <PostImageFallback
                title={post.title}
                category={post.categories?.[0]?.name}
                className="aspect-video"
              />
            )}
            <div className="flex flex-1 flex-col p-4">
              <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary dark:text-white">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="mt-1 line-clamp-2 flex-1 text-xs text-gray-500 dark:text-gray-400">
                  {post.excerpt}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="h-3 w-3" />
                {post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "Draft"}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
