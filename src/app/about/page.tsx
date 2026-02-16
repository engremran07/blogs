import { prisma } from "@/server/db/prisma";
import { Users, BookOpen, MessageSquare, Globe } from "lucide-react";
import { AdContainer } from "@/features/ads/ui/AdContainer";
import type { Metadata } from "next";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://example.com").replace(/\/$/, "");

export const revalidate = 86400; // ISR: rebuild at most once per day

export async function generateMetadata(): Promise<Metadata> {
  const settings = await prisma.siteSettings.findFirst({ select: { siteName: true, siteDescription: true } });
  const siteName = settings?.siteName || "MyBlog";
  const description = settings?.siteDescription || `Learn more about ${siteName}`;

  return {
    title: "About",
    description: `About ${siteName} — ${description}`,
    alternates: { canonical: `${SITE_URL}/about` },
    openGraph: {
      title: `About | ${siteName}`,
      description: `About ${siteName} — ${description}`,
      url: `${SITE_URL}/about`,
      type: "website",
      siteName,
      locale: "en_US",
    },
    twitter: {
      card: "summary",
      title: `About | ${siteName}`,
      description: `About ${siteName} — ${description}`,
    },
  };
}

export default async function AboutPage() {
  const [postCount, commentCount, tagCount, settings] = await Promise.all([
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.comment.count({ where: { status: "APPROVED", deletedAt: null } }),
    prisma.tag.count(),
    prisma.siteSettings.findFirst(),
  ]);

  const siteName = settings?.siteName || "MyBlog";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          About {siteName}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {settings?.siteDescription || "A modern blog platform built with passion for sharing knowledge and ideas."}
        </p>
      </div>

      {/* Stats */}
      <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
        {[
          { icon: BookOpen, label: "Articles", value: postCount },
          { icon: MessageSquare, label: "Comments", value: commentCount },
          { icon: Globe, label: "Topics", value: tagCount },
          { icon: Users, label: "Community", value: "Growing" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800"
          >
            <stat.icon className="mx-auto mb-2 h-8 w-8 text-blue-600 dark:text-blue-400" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* In-Content Ad */}
      <div className="mb-12">
        <AdContainer position="IN_CONTENT" pageType="about" />
      </div>

      {/* Content */}
      <div className="prose prose-lg dark:prose-invert mx-auto max-w-none">
        <h2>Our Mission</h2>
        <p>
          We believe in the power of sharing knowledge. Our platform is designed to make it easy
          for writers to publish their thoughts and for readers to discover great content.
        </p>

        <h2>What We Offer</h2>
        <ul>
          <li>
            <strong>Quality Content:</strong> Carefully crafted articles covering a wide range of topics.
          </li>
          <li>
            <strong>Community:</strong> An engaged community where readers can share their thoughts through comments.
          </li>
          <li>
            <strong>Open Platform:</strong> A space for both experienced and aspiring writers to share their expertise.
          </li>
        </ul>

        <h2>Technology</h2>
        <p>
          Built with modern web technologies including Next.js, React, and PostgreSQL,
          our platform delivers a fast, accessible, and beautiful reading experience.
        </p>

        <h2>Get Involved</h2>
        <p>
          Whether you want to contribute articles, participate in discussions, or simply enjoy
          reading, we welcome you. Feel free to create an account and join the conversation!
        </p>
      </div>

      {/* Bottom Ad */}
      <div className="mt-12">
        <AdContainer position="IN_FEED" pageType="about" />
      </div>
    </div>
  );
}
