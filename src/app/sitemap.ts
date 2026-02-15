import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL.replace(/\/$/, "");

  // Fetch published posts
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch published pages (exclude noIndex pages)
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED", deletedAt: null, noIndex: { not: true } },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch categories
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
  });

  // Fetch tags
  const tags = await prisma.tag.findMany({
    select: { slug: true, updatedAt: true },
  });

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/tags`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  // Post routes
  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Page routes
  const pageRoutes: MetadataRoute.Sitemap = pages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Category routes
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/blog?category=${cat.slug}`,
    lastModified: cat.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Tag routes
  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${baseUrl}/tags/${tag.slug}`,
    lastModified: tag.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  return [...staticRoutes, ...postRoutes, ...pageRoutes, ...categoryRoutes, ...tagRoutes];
}
