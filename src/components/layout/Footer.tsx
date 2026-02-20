import Link from "next/link";
import Image from "next/image";
import {
  Github,
  Twitter,
  Heart,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

interface SocialLinks {
  github: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  youtube: string | null;
}

export function Footer({
  siteName = "MyBlog",
  socialLinks,
  logoUrl,
}: {
  siteName?: string;
  socialLinks?: SocialLinks | null;
  logoUrl?: string | null;
}) {
  const year = new Date().getFullYear();

  const socials = [
    { href: socialLinks?.github, icon: Github, label: "GitHub" },
    { href: socialLinks?.twitter, icon: Twitter, label: "Twitter" },
    { href: socialLinks?.facebook, icon: Facebook, label: "Facebook" },
    { href: socialLinks?.instagram, icon: Instagram, label: "Instagram" },
    { href: socialLinks?.linkedin, icon: Linkedin, label: "LinkedIn" },
    { href: socialLinks?.youtube, icon: Youtube, label: "YouTube" },
  ].filter((s) => s.href);

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt={siteName}
                  width={128}
                  height={32}
                  className="h-8 w-auto max-w-32 object-contain"
                  unoptimized
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-white">
                  {siteName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {siteName}
              </span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              A modern blog platform built with Next.js. Sharing ideas,
              tutorials, and insights.
            </p>
            {socials.length > 0 && (
              <div className="mt-4 flex gap-3">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <s.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/tags"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Tags
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap.xml"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter placeholder */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Subscribe
            </h4>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Get the latest posts delivered to your inbox.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row">
          <p>
            &copy; {year} {siteName}. All rights reserved.
          </p>
          <p className="mt-2 flex items-center gap-1 sm:mt-0">
            Made with <Heart className="h-3 w-3 text-red-500" /> using Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
