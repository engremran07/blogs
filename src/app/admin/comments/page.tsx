"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Check, X, Trash2, AlertTriangle, MessageSquare, ExternalLink, Search,
  CheckSquare, Square, ChevronDown, MoreHorizontal, ShieldAlert, ShieldCheck, ShieldX,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/Modal";

interface CommentRow {
  id: string;
  content: string;
  authorName: string | null;
  authorEmail: string | null;
  status: string;
  spamScore: number;
  createdAt: string;
  post: { id: string; title: string; slug: string } | null;
  user: { username: string; displayName: string | null } | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  SPAM: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  REJECTED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  DELETED: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500",
  FLAGGED: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

const tabs = [
  { key: "", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "SPAM", label: "Spam" },
  { key: "REJECTED", label: "Rejected" },
  { key: "DELETED", label: "Deleted" },
  { key: "FLAGGED", label: "Flagged" },
];

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const perPage = 20;

  // Bulk
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

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ all: "true", take: String(perPage), skip: String((page - 1) * perPage) });
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/comments?${params}`);
      const data = await res.json();
      setComments(data.data || []);
      setTotal(data.total || 0);
    } catch { toast("Failed to fetch comments", "error"); }
    finally { setLoading(false); }
  }, [statusFilter, page, search]);

  useEffect(() => { fetchComments(); }, [fetchComments]);
  useEffect(() => { setSelected(new Set()); }, [page, statusFilter]);

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await res.json();
      if (data.success) { toast(`Comment ${status.toLowerCase()}`, "success"); fetchComments(); }
    } catch { toast("Failed to update comment", "error"); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try { await fetch(`/api/comments/${deleteId}`, { method: "DELETE" }); toast("Comment deleted", "success"); fetchComments(); }
    catch { toast("Failed to delete", "error"); }
    finally { setDeleteId(null); }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(selected.size === comments.length ? new Set() : new Set(comments.map((c) => c.id)));
  }

  async function executeBulkAction() {
    if (!bulkConfirm) return;
    try {
      const res = await fetch("/api/comments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkConfirm.action, ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.success) { toast(data.message, "success"); setSelected(new Set()); fetchComments(); }
      else toast(data.error || "Bulk action failed", "error");
    } catch { toast("Bulk action failed", "error"); }
    finally { setBulkConfirm(null); setBulkMenuOpen(false); }
  }

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); fetchComments(); }

  const totalPages = Math.ceil(total / perPage);
  const allSelected = comments.length > 0 && selected.size === comments.length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Comments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{total} comments</p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${statusFilter === tab.key ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white" : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Bulk */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="flex-1 min-w-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </form>

        {selected.size > 0 && (
          <div className="relative" ref={bulkMenuRef}>
            <Button variant="secondary" onClick={() => setBulkMenuOpen(!bulkMenuOpen)} icon={<MoreHorizontal className="h-4 w-4" />}>
              Bulk ({selected.size}) <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button onClick={() => setBulkConfirm({ action: "approve", label: "approve" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><ShieldCheck className="h-4 w-4 text-green-500" /> Approve</button>
                <button onClick={() => setBulkConfirm({ action: "reject", label: "reject" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><ShieldX className="h-4 w-4 text-gray-500" /> Reject</button>
                <button onClick={() => setBulkConfirm({ action: "spam", label: "mark as spam" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><ShieldAlert className="h-4 w-4 text-orange-500" /> Mark as Spam</button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button onClick={() => setBulkConfirm({ action: "delete", label: "delete" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Select All Row */}
      {comments.length > 0 && (
        <div className="mb-3 flex items-center gap-3">
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {allSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />)
          : comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-xl border p-4 ${selected.has(comment.id) ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/10" : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button onClick={() => toggleSelect(comment.id)} className="mt-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                      {selected.has(comment.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {comment.user?.displayName || comment.user?.username || comment.authorName || "Anonymous"}
                        </span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[comment.status] || ""}`}>{comment.status}</span>
                        {comment.spamScore > 30 && (
                          <span className="flex items-center gap-1 text-xs text-orange-500">
                            <AlertTriangle className="h-3 w-3" /> Spam: {comment.spamScore}%
                          </span>
                        )}
                      </div>
                      {comment.authorEmail && <p className="text-xs text-gray-400">{comment.authorEmail}</p>}
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">{comment.content}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        {comment.post && (
                          <a href={`/blog/${comment.post.slug}`} target="_blank" className="flex items-center gap-1 text-blue-500 hover:underline">
                            <ExternalLink className="h-3 w-3" /> {comment.post.title}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="ml-4 flex items-center gap-1">
                    {comment.status !== "APPROVED" && (
                      <button onClick={() => updateStatus(comment.id, "APPROVED")} className="rounded p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20" title="Approve"><Check className="h-4 w-4" /></button>
                    )}
                    {comment.status !== "REJECTED" && (
                      <button onClick={() => updateStatus(comment.id, "REJECTED")} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" title="Reject"><X className="h-4 w-4" /></button>
                    )}
                    {comment.status !== "SPAM" && (
                      <button onClick={() => updateStatus(comment.id, "SPAM")} className="rounded p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Mark as Spam"><AlertTriangle className="h-4 w-4" /></button>
                    )}
                    <button onClick={() => setDeleteId(comment.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
        {!loading && comments.length === 0 && (
          <div className="py-12 text-center">
            <MessageSquare className="mx-auto mb-2 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">No comments found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}</p>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700">Next</button>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Comment" message="This comment will be soft-deleted and can be restored later." confirmText="Delete" variant="danger" />
      <ConfirmDialog open={!!bulkConfirm} onClose={() => { setBulkConfirm(null); setBulkMenuOpen(false); }} onConfirm={executeBulkAction} title={`Bulk ${bulkConfirm?.label || ""}`} message={`${bulkConfirm?.label} ${selected.size} comment(s)?`} confirmText={bulkConfirm?.action === "delete" ? "Delete All" : "Confirm"} variant={bulkConfirm?.action === "delete" ? "danger" : "primary"} />
    </div>
  );
}
