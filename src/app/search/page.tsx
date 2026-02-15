"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search as SearchIcon, Calendar, Eye, Clock, Loader2, X } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  readingTime: number;
  viewCount: number;
  author: { username: string; displayName: string | null };
  tags: { name: string; slug: string }[];
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/posts?search=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQ) doSearch(initialQ);
  }, [initialQ, doSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-center text-3xl font-bold text-gray-900 dark:text-white">
        Search Articles
      </h1>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, content, or tag..."
            className="w-full rounded-xl border border-gray-300 bg-white py-4 pl-12 pr-12 text-lg focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="py-12 text-center">
          <SearchIcon className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-lg text-gray-500 dark:text-gray-400">
            No results found for &ldquo;{query}&rdquo;
          </p>
          <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
            Try different keywords or check your spelling
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {searched && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
            </p>
          )}
          {results.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex gap-5 rounded-xl border border-gray-200 bg-white p-5 transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
            >
              {post.featuredImage && (
                <div className="hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:block dark:bg-gray-700">
                  <img
                    src={post.featuredImage}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <h2 className="mb-1 font-semibold text-gray-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Draft"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {post.readingTime} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {post.viewCount}
                  </span>
                  {post.tags?.slice(0, 3).map((tag) => (
                    <span key={tag.slug} className="rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
