import Link from "next/link";
import { Github, Twitter, Rss, Heart } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
                B
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-white">MyBlog</span>
            </Link>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              A modern blog platform built with Next.js. Sharing ideas, tutorials, and insights.
            </p>
            <div className="mt-4 flex gap-3">
              <a href="#" className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
                <Github className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
                <Twitter className="h-5 w-5" />
              </a>
              <Link href="/rss" className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
                <Rss className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Navigation</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Home</Link></li>
              <li><Link href="/blog" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Blog</Link></li>
              <li><Link href="/tags" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Tags</Link></li>
              <li><Link href="/about" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">About</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Terms of Service</Link></li>
              <li><Link href="/contact" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Contact</Link></li>
            </ul>
          </div>

          {/* Newsletter placeholder */}
          <div>
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Subscribe</h4>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              Get the latest posts delivered to your inbox.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between border-t border-gray-200 pt-6 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row">
          <p>© {year} MyBlog. All rights reserved.</p>
          <p className="mt-2 flex items-center gap-1 sm:mt-0">
            Made with <Heart className="h-3 w-3 text-red-500" /> using Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
