import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/server/db/prisma";
import { auth } from "@/server/auth";
import { Calendar, Clock, Tag, Eye } from "lucide-react";
import { Badge, Avatar } from "@/components/ui/Card";
import { CommentSection } from "./CommentSection";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { SocialShare } from "@/components/blog/SocialShare";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { PostNavigation } from "@/components/blog/PostNavigation";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, buildPersonJsonLd, buildFaqJsonLd, serializeJsonLd } from "@/features/seo/server/json-ld.util";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import { InArticleAd } from "@/features/ads/ui/InArticleAd";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PostImageFallback } from "@/components/blog/PostImageFallback";
import type { Metadata } from "next";
import type { PostListItem, CategoryItem } from "@/types/prisma-helpers";

export const revalidate = 3600; // ISR: rebuild at most every hour

/** Pre-render all published post slugs at build time */
export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { slug: true },
    take: 500,
  });
  return posts.map((p) => ({ slug: p.slug }));
}

interface PostPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    prisma.post.findUnique({
      where: { slug },
      select: {
        title: true, excerpt: true, seoTitle: true, seoDescription: true,
        featuredImage: true, featuredImageAlt: true, noIndex: true, noFollow: true,
        ogTitle: true, ogDescription: true, ogImage: true,
        twitterCard: true, twitterTitle: true, twitterDescription: true, twitterImage: true,
        canonicalUrl: true, seoKeywords: true,
        publishedAt: true, updatedAt: true,
        author: { select: { displayName: true, username: true } },
        categories: { select: { name: true } },
        tags: { select: { name: true } },
      },
    }),
    prisma.siteSettings.findFirst({ select: { siteName: true } }),
  ]);
  if (!post) return { title: "Post Not Found" };

  const siteName = settings?.siteName || "MyBlog";
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");
  const pageUrl = `${baseUrl}/blog/${slug}`;
  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || "";
  const ogImage = post.ogImage || post.featuredImage;
  const authorName = post.author?.displayName || post.author?.username || undefined;

  // Dynamic OG image fallback when no featured image exists
  const ogImageUrl = ogImage
    ? ogImage
    : `${baseUrl}/api/og?${new URLSearchParams({
        title: post.title,
        ...(authorName ? { author: authorName } : {}),
        ...(post.categories?.[0]?.name ? { category: post.categories[0].name } : {}),
        siteName,
        ...(post.publishedAt ? { date: new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) } : {}),
      }).toString()}`;

  return {
    title,
    description,
    keywords: post.seoKeywords?.length ? post.seoKeywords : undefined,
    authors: authorName ? [{ name: authorName }] : undefined,
    alternates: {
      canonical: post.canonicalUrl || pageUrl,
    },
    openGraph: {
      title: post.ogTitle || title,
      description: post.ogDescription || description,
      url: pageUrl,
      type: "article",
      siteName,
      locale: "en_US",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.featuredImageAlt || title }],
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: authorName ? [authorName] : undefined,
      section: post.categories?.[0]?.name,
      tags: post.tags?.map((t) => t.name),
    },
    twitter: {
      card: (post.twitterCard as "summary" | "summary_large_image") || "summary_large_image",
      title: post.twitterTitle || post.ogTitle || title,
      description: post.twitterDescription || post.ogDescription || description,
      images: [post.twitterImage || ogImageUrl],
    },
    ...((post as Record<string, unknown>).noIndex || (post as Record<string, unknown>).noFollow
      ? { robots: { index: !(post as Record<string, unknown>).noIndex, follow: !(post as Record<string, unknown>).noFollow } }
      : {}),
  };
}

export default async function PostPage({ params, searchParams }: PostPageProps) {
  const { slug } = await params;
  const { preview } = await searchParams;

  type PostDetail = PostListItem & { content: string; bio?: string; featuredImageAlt: string | null; updatedAt: Date; wordCount: number; seoTitle: string | null; seoDescription: string | null; author: { id: string; username: string; displayName: string | null; bio: string | null } | null; categories: CategoryItem[] };

  // Check if this is an admin preview request
  const isPreviewRequest = preview === "true";
  let isAdmin = false;

  if (isPreviewRequest) {
    const session = await auth();
    isAdmin = session?.user?.role === "ADMINISTRATOR" || session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "EDITOR";
  }

  const [post, settings, commentSettings] = await Promise.all([
    prisma.post.findUnique({
      where: isAdmin ? { slug } : { slug, status: "PUBLISHED" },
      include: {
        author: { select: { id: true, username: true, displayName: true, bio: true } },
        tags: { select: { id: true, name: true, slug: true } },
        categories: { select: { id: true, name: true, slug: true } },
      },
    }) as Promise<PostDetail | null>,
    prisma.siteSettings.findFirst(),
    prisma.commentSettings.findFirst({ select: { commentsEnabled: true } }),
  ]);

  if (!post) notFound();

  // Don't increment views for preview mode
  const isPreview = isAdmin && post.status !== "PUBLISHED";

  // Feature toggles from settings
  const showToc = settings?.tableOfContentsEnabled ?? false;
  const showSocialShare = settings?.socialSharingEnabled ?? true;
  const showRelated = settings?.relatedPostsEnabled ?? true;
  const showPostNav = settings?.showPostNavigation ?? true;
  const commentsEnabled = commentSettings?.commentsEnabled ?? true;

  // Sidebar settings (same pattern as blog index)
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

  // Increment view count (skip in preview mode)
  if (!isPreview) {
    await prisma.post.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  const postUrl = `/blog/${post.slug}`;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");
  const fullPostUrl = `${baseUrl}/blog/${post.slug}`;

  // Build JSON-LD structured data
  const siteName = settings?.siteName || "MyBlog";
  const articleJsonLd = buildArticleJsonLd({
    title: post.title,
    description: post.excerpt || "",
    url: fullPostUrl,
    imageUrl: post.featuredImage || undefined,
    authorName: post.author?.displayName || post.author?.username || "Unknown",
    publisherName: siteName,
    publisherLogoUrl: (settings as Record<string, unknown>)?.logoUrl as string | undefined,
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString(),
    modifiedAt: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    section: post.categories?.[0]?.name,
    tags: post.tags?.map((t: { name: string }) => t.name),
    wordCount: post.wordCount || undefined,
    language: "en",
  });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: baseUrl },
    { name: "Blog", url: `${baseUrl}/blog` },
    ...(post.categories?.[0] ? [{ name: post.categories[0].name, url: `${baseUrl}/blog?category=${post.categories[0].slug}` }] : []),
    { name: post.title, url: fullPostUrl },
  ]);

  // Person JSON-LD for the author
  const personJsonLd = post.author ? buildPersonJsonLd({
    name: post.author.displayName || post.author.username,
    url: `${baseUrl}/blog?author=${post.author.username}`,
  }) : null;

  // Auto-detect FAQ patterns in content (Q&A, details/summary, headings ending with ?)
  const faqItems: { question: string; answer: string }[] = [];
  if (post.content) {
    // Pattern 1: <details><summary>Question</summary>Answer</details>
    const detailsRegex = /<details[^>]*>\s*<summary[^>]*>([^<]+)<\/summary>\s*([\s\S]*?)<\/details>/gi;
    let match;
    while ((match = detailsRegex.exec(post.content)) !== null) {
      faqItems.push({ question: match[1].trim(), answer: match[2].replace(/<[^>]+>/g, '').trim() });
    }
    // Pattern 2: Headings ending with ? followed by paragraph content
    if (faqItems.length === 0) {
      const headingQRegex = /<h[2-4][^>]*>([^<]*\?)<\/h[2-4]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
      while ((match = headingQRegex.exec(post.content)) !== null) {
        faqItems.push({ question: match[1].trim(), answer: match[2].replace(/<[^>]+>/g, '').trim() });
      }
    }
  }
  const faqJsonLd = faqItems.length >= 2 ? buildFaqJsonLd(faqItems) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {personJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(personJsonLd) }}
        />
      )}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}
      {/* Preview Banner */}
      {isPreview && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <Eye className="h-4 w-4" />
          Preview Mode — This post is <span className="font-bold">{post.status}</span> and not visible to the public.
          <Link href={`/admin/posts/${post.id}/edit`} className="ml-auto text-amber-600 underline hover:text-amber-700 dark:text-amber-400">Edit Post</Link>
        </div>
      )}
      <div className="flex gap-8">
        {/* Table of Contents - Desktop Sidebar */}
        {showToc && post.content && (
          <aside className="hidden xl:block w-64 shrink-0">
            <div className="sticky top-24">
              <TableOfContents content={post.content} />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <article className="mx-auto max-w-4xl flex-1 min-w-0">
          {/* Visual Breadcrumbs */}
          <Breadcrumbs items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            ...(post.categories?.[0] ? [{ label: post.categories[0].name, href: `/blog?category=${post.categories[0].slug}` }] : []),
            { label: post.title },
          ]} />

          {/* Header */}
          <header className="mb-8">
            <div className="mb-4 flex flex-wrap gap-2">
              {post.categories.map((cat) => (
                <Badge key={cat.id} variant="info">
                  {cat.name}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">{post.excerpt}</p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-6 border-b border-gray-200 pb-6 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Avatar
                  fallback={post.author?.displayName || post.author?.username || "A"}
                  size="md"
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {post.author?.displayName || post.author?.username}
                  </p>
                  {post.author?.bio && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{post.author.bio}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Draft"}
                </span>
                {post.readingTime > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {post.readingTime} min read
                  </span>
                )}
                <span>{post.viewCount.toLocaleString()} views</span>
              </div>
            </div>
          </header>

          {/* Social Share - Top */}
          {showSocialShare && (
            <div className="mb-6">
              <SocialShare url={postUrl} title={post.title} />
            </div>
          )}

          {/* ToC - Mobile (inline above content) */}
          {showToc && post.content && (
            <div className="mb-8 xl:hidden">
              <TableOfContents content={post.content} />
            </div>
          )}

          {/* Featured Image */}
          {post.featuredImage ? (
            <div className="relative mb-10 aspect-video overflow-hidden rounded-2xl">
              <Image
                src={post.featuredImage}
                alt={post.featuredImageAlt || post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 896px"
                priority
              />
            </div>
          ) : (
            <PostImageFallback
              title={post.title}
              category={post.categories?.[0]?.name}
              className="mb-10 aspect-video rounded-2xl"
            />
          )}

          {/* Content with auto-injected in-article ads */}
          <InArticleAd
            content={post.content || ""}
            pageType="blog"
            className="prose prose-lg prose-blue dark:prose-invert max-w-none
              prose-headings:scroll-mt-20
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-xl
              prose-pre:overflow-x-auto prose-pre:rounded-xl
              prose-code:rounded prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal dark:prose-code:bg-gray-800"
          />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-10 border-t border-gray-200 pt-6 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-4 w-4 text-gray-400" />
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-blue-600 dark:hover:text-blue-400"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Social Sharing */}
          {showSocialShare && (
            <div className="mt-6">
              <SocialShare url={postUrl} title={post.title} />
            </div>
          )}

          {/* Post Navigation (Prev / Next) */}
          {showPostNav && (
            <div className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-700">
              <PostNavigation currentPostId={post.id} publishedAt={post.publishedAt} />
            </div>
          )}

          {/* Related Posts */}
          {showRelated && (post.tags.length > 0 || post.categories.length > 0) && (
            <div className="mt-10 border-t border-gray-200 pt-8 dark:border-gray-700">
              <RelatedPosts postId={post.id} tagIds={post.tags.map((t) => t.id)} categoryIds={post.categories.map((c) => c.id)} />
            </div>
          )}

          {/* In-Content Ad */}
          <div className="mt-8">
            <AdContainer position="IN_CONTENT" pageType="blog" showPlaceholder />
          </div>

          {/* Before Comments Ad */}
          <div className="mt-6">
            <AdContainer position="BEFORE_COMMENTS" pageType="blog" />
          </div>

          {/* Comments */}
          {commentsEnabled && (
            <section className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
              <CommentSection postId={post.id} />
            </section>
          )}
        </article>

        {/* Sidebar */}
        {sidebarSettings.sidebarEnabled && (
          <div className="hidden lg:block w-80 shrink-0">
            <BlogSidebar settings={sidebarSettings} pageType="blog" />
          </div>
        )}
      </div>
    </div>
  );
}
