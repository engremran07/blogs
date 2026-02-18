"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus, Search, Eye, Edit2, Trash2, CheckSquare, Square,
  ChevronDown, Archive, FileText, Send, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";
import { AdminPagination, ADMIN_PAGE_SIZE } from "@/components/ui/AdminPagination";

interface PostRow {
  id: string;
  postNumber: number;
  title: string;
  slug: string;
  status: string;
  viewCount: number;
  createdAt: string;
  publishedAt: string | null;
  author: { username: string; displayName: string | null };
  tags: { name: string }[];
}

const statusColors: Record<string, string> = {
  PUBLISHED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  DRAFT: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  SCHEDULED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  ARCHIVED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const perPage = ADMIN_PAGE_SIZE;

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; label: string } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Close bulk menu on click outside
  useEffect(() => {
    if (!bulkMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setBulkMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bulkMenuOpen]);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        all: "true",
        take: String(perPage),
        skip: String((page - 1) * perPage),
      });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/posts?${params}`);
      const data = await res.json();
      setPosts(data.data || []);
      setTotal(data.total || 0);
    } catch {
      toast("Failed to fetch posts", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, perPage]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => { setSelected(new Set()); }, [page, statusFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/posts/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast("Post deleted", "success"); fetchPosts(); }
      else toast(data.error || "Failed to delete", "error");
    } catch { toast("Failed to delete post", "error"); }
    finally { setDeleteId(null); }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(selected.size === posts.length ? new Set() : new Set(posts.map((p) => p.id)));
  }

  async function executeBulkAction() {
    if (!bulkConfirm) return;
    try {
      const res = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkConfirm.action, ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.success) { toast(data.message, "success"); setSelected(new Set()); fetchPosts(); }
      else toast(data.error || "Bulk action failed", "error");
    } catch { toast("Bulk action failed", "error"); }
    finally { setBulkConfirm(null); setBulkMenuOpen(false); }
  }

  const totalPages = Math.ceil(total / perPage);
  const allSelected = posts.length > 0 && selected.size === posts.length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} total posts</p>
        </div>
        <Link href="/admin/posts/new">
          <Button icon={<Plus className="h-4 w-4" />}>New Post</Button>
        </Link>
      </div>

      {/* Filters + Bulk */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </form>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        {selected.size > 0 && (
          <div className="relative" ref={bulkMenuRef}>
            <Button variant="secondary" onClick={() => setBulkMenuOpen(!bulkMenuOpen)} icon={<MoreHorizontal className="h-4 w-4" />}>
              Bulk ({selected.size}) <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button onClick={() => setBulkConfirm({ action: "publish", label: "publish" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Send className="h-4 w-4 text-green-500" /> Publish
                </button>
                <button onClick={() => setBulkConfirm({ action: "draft", label: "move to draft" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  <FileText className="h-4 w-4 text-gray-500" /> Move to Draft
                </button>
                <button onClick={() => setBulkConfirm({ action: "archive", label: "archive" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  <Archive className="h-4 w-4 text-yellow-500" /> Archive
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button onClick={() => setBulkConfirm({ action: "delete", label: "delete" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-800/80">
                <th className="px-3 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                    {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Author</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Views</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></td>
                    ))}</tr>
                  ))
                : posts.map((post) => (
                    <tr key={post.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selected.has(post.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(post.id)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          {selected.has(post.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{post.title}</p>
                        <div className="mt-0.5 flex gap-1">{post.tags?.slice(0, 3).map((t) => (<span key={t.name} className="text-xs text-gray-400">#{t.name}</span>))}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{post.author?.displayName || post.author?.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[post.status] || ""}`}>{post.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{post.viewCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={post.status === "PUBLISHED" ? `/blog/${post.slug}` : `/blog/${post.slug}?preview=true`} target="_blank" className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700" title={post.status === "PUBLISHED" ? "View" : "Preview"}><Eye className="h-4 w-4" /></Link>
                          <Link href={`/admin/posts/${post.postNumber}/edit`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700" title="Edit"><Edit2 className="h-4 w-4" /></Link>
                          <button onClick={() => setDeleteId(String(post.postNumber))} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && posts.length === 0 && <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No posts found</p>}
        </div>
        <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Post" message="Are you sure you want to delete this post?" confirmText="Delete" variant="danger" />
      <ConfirmDialog open={!!bulkConfirm} onClose={() => { setBulkConfirm(null); setBulkMenuOpen(false); }} onConfirm={executeBulkAction} title={`Bulk ${bulkConfirm?.label || ""}`} message={`${bulkConfirm?.label} ${selected.size} post(s)?`} confirmText={bulkConfirm?.action === "delete" ? "Delete All" : "Confirm"} variant={bulkConfirm?.action === "delete" ? "danger" : "primary"} />
    </div>
  );
}
