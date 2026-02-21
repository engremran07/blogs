"use client";

import Link from "next/link";

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8">
      <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
        Failed to load post
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-gray-500 dark:text-gray-400">
        {error.message ||
          "An unexpected error occurred while loading this post."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
        <Link
          href="/blog"
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
        >
          Back to Blog
        </Link>
      </div>
    </div>
  );
}
