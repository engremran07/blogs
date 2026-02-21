"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  MessageSquare, ThumbsUp, Send, Loader2,
  ChevronDown, ChevronUp, ArrowUpDown,
  ChevronLeft, ChevronRight, MoreHorizontal, Flag,
} from "lucide-react";
import { Avatar } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import Captcha from "@/features/captcha/ui/Captcha";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

interface Comment {
  id: string;
  content: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  status: string;
  parentId: string | null;
  upvotes: number;
  replies?: Comment[];
}

type SortMode = "newest" | "oldest" | "popular";

interface CommentSectionProps {
  postId: string;
  /** Max visible nesting depth before replies collapse (default 4) */
  maxDepth?: number;
  /** Comments per page (default 10) */
  perPage?: number;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Pagination Component                                                      */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Pagination({
  page, totalPages, onChange,
}: {
  page: number; totalPages: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  /** Build an array like [1, '...', 4, 5, 6, '...', 20] */
  function pages(): (number | "...")[] {
    const items: (number | "...")[] = [];
    const delta = 1; // pages around current
    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    items.push(1);
    if (left > 2) items.push("...");
    for (let i = left; i <= right; i++) items.push(i);
    if (right < totalPages - 1) items.push("...");
    if (totalPages > 1) items.push(totalPages);
    return items;
  }

  return (
    <nav className="mt-6 flex items-center justify-center gap-1" aria-label="Comments pagination">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages().map((p, idx) =>
        p === "..." ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-gray-400">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`min-w-8 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
              p === page
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            }`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CommentSection                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function CommentSection({ postId, maxDepth = 4, perPage = 10 }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [replyCaptchaToken, setReplyCaptchaToken] = useState("");
  const [captchaNonce, setCaptchaNonce] = useState(0);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalComments, setTotalComments] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Sorting state
  const [sort, setSort] = useState<SortMode>("newest");

  // Collapsed threads (set of comment IDs whose children are hidden)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  /* ── Fetch comments with pagination ──────────────────────────────────── */
  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?postId=${postId}&page=${page}&limit=${perPage}`,
      );
      const data = await res.json();
      if (data.success) {
        // Build tree from flat list
        const map = new Map<string, Comment>();
        const roots: Comment[] = [];
        (data.data || []).forEach((c: Comment) => {
          map.set(c.id, { ...c, replies: [] });
        });
        map.forEach((c) => {
          if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.replies!.push(c);
          } else {
            roots.push(c);
          }
        });

        // Client-side sort
        const doSort = (list: Comment[], mode: SortMode): Comment[] => {
          const s = [...list];
          switch (mode) {
            case "newest":
              s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              break;
            case "oldest":
              s.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              break;
            case "popular":
              s.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
              break;
          }
          s.forEach((c) => { if (c.replies?.length) c.replies = doSort(c.replies, mode); });
          return s;
        };
        setComments(doSort(roots, sort));
        setTotalComments(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [postId, page, perPage, sort]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /* ── Collapse toggle ─────────────────────────────────────────────────── */
  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ── Count all nested replies ────────────────────────────────────────── */
  function countReplies(comment: Comment): number {
    if (!comment.replies?.length) return 0;
    return comment.replies.reduce((sum, r) => sum + 1 + countReplies(r), 0);
  }

  /* ── Flag/Report handler ──────────────────────────────────────────────── */
  async function handleFlag(commentId: string) {
    if (!session?.user) {
      toast("Please sign in to report a comment", "error");
      return;
    }
    const reason = window.prompt("Why are you reporting this comment?");
    if (!reason?.trim()) return;
    try {
      const res = await fetch(`/api/comments/${commentId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Comment reported. Thank you.", "success");
      } else {
        toast(data.error || "Failed to report", "error");
      }
    } catch {
      toast("Failed to report comment", "error");
    }
  }

  /* ── Vote handler ────────────────────────────────────────────────────── */
  async function handleVote(commentId: string) {
    if (!session?.user) {
      toast("Please sign in to vote", "error");
      return;
    }
    try {
      const res = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "UP" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchComments();
      } else {
        toast(data.error || "Failed to vote", "error");
      }
    } catch {
      toast("Failed to vote", "error");
    }
  }

  /* ── Submit comment ──────────────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent, parentId?: string | null) {
    e.preventDefault();
    const text = parentId ? replyContent : content;
    if (!text.trim()) return;

    const token = parentId ? replyCaptchaToken : captchaToken;
    if (!token) {
      toast("Please complete the security check", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content: text,
          parentId: parentId || undefined,
          authorName: session?.user?.name || guestName || "Anonymous",
          authorEmail: session?.user?.email || guestEmail || "",
          captchaToken: token,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Comment submitted! It will appear after moderation.", "success");
        if (parentId) {
          setReplyContent("");
          setReplyTo(null);
          setReplyCaptchaToken("");
        } else {
          setContent("");
        }
        fetchComments();
        setCaptchaNonce((n) => n + 1);
        setCaptchaToken("");
      } else {
        toast(data.error || "Failed to post comment", "error");
      }
    } catch {
      toast("Failed to post comment", "error");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Time ago helper ─────────────────────────────────────────────────── */
  function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  /* ═════════════════════════════════════════════════════════════════════ */
  /*  Render a single comment + nested replies                            */
  /* ═════════════════════════════════════════════════════════════════════ */

  function renderComment(comment: Comment, depth = 0) {
    const isCollapsed = collapsed.has(comment.id);
    const replyCount = countReplies(comment);
    const atMaxDepth = depth >= maxDepth;

    return (
      <div
        key={comment.id}
        className={
          depth > 0
            ? "ml-4 border-l-2 border-gray-200 pl-4 sm:ml-6 sm:pl-5 dark:border-gray-700"
            : ""
        }
      >
        <div className="group mb-3 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100/70 dark:bg-gray-800/50 dark:hover:bg-gray-800/80">
          {/* Author row */}
          <div className="mb-2 flex items-center gap-3">
            <Avatar fallback={comment.authorName} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.authorName}
              </p>
              <p
                className="text-xs text-gray-500 dark:text-gray-400"
                title={new Date(comment.createdAt).toLocaleString()}
              >
                {timeAgo(comment.createdAt)}
              </p>
            </div>
            {/* Thread depth indicator */}
            {depth > 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                lvl {depth}
              </span>
            )}
          </div>

          {/* Body */}
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap dark:text-gray-300">
            {comment.content}
          </p>

          {/* Actions bar */}
          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => handleVote(comment.id)}
              className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.upvotes > 0 && <span>{comment.upvotes}</span>}
            </button>
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="text-xs text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
            >
              Reply
            </button>
            {session?.user && (
              <button
                onClick={() => handleFlag(comment.id)}
                className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500"
                title="Report this comment"
              >
                <Flag className="h-3 w-3" />
                Report
              </button>
            )}
            {/* Collapse / Expand toggle */}
            {(comment.replies?.length ?? 0) > 0 && (
              <button
                onClick={() => toggleCollapse(comment.id)}
                className="ml-auto flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isCollapsed ? (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show {replyCount} {replyCount === 1 ? "reply" : "replies"}
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Hide replies
                  </>
                )}
              </button>
            )}
          </div>

          {/* Reply form (inline) */}
          {replyTo === comment.id && (
            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder={`Replying to ${comment.authorName}…`}
                rows={2}
              />
              <div className="mt-2">
                <Captcha
                  onVerify={(token) => setReplyCaptchaToken(token)}
                  resetNonce={captchaNonce}
                />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" loading={submitting} icon={<Send className="h-3 w-3" />}>
                  Reply
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Nested replies */}
        {!isCollapsed && comment.replies && comment.replies.length > 0 && (
          atMaxDepth ? (
            /* At max depth, flatten remaining replies instead of further nesting */
            <div className="ml-4 sm:ml-6">
              <p className="mb-2 text-xs text-gray-400 dark:text-gray-500">
                — Continued thread ({replyCount} more {replyCount === 1 ? "reply" : "replies"}) —
              </p>
              {comment.replies.map((reply) => (
                <Fragment key={reply.id}>{renderComment(reply, depth)}</Fragment>
              ))}
            </div>
          ) : (
            comment.replies.map((reply) => (
              <Fragment key={reply.id}>{renderComment(reply, depth + 1)}</Fragment>
            ))
          )
        )}
      </div>
    );
  }

  /* ═════════════════════════════════════════════════════════════════════ */
  /*  Main render                                                         */
  /* ═════════════════════════════════════════════════════════════════════ */

  return (
    <div>
      {/* Header with count & sort */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
          <MessageSquare className="h-6 w-6" />
          Comments
          {totalComments > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {totalComments}
            </span>
          )}
        </h2>

        {/* Sort controls */}
        {totalComments > 1 && (
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
            {(["newest", "oldest", "popular"] as SortMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => { setSort(mode); setPage(1); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  sort === mode
                    ? "bg-primary text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                {mode === sort && <ArrowUpDown className="h-3 w-3" />}
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800/30">
        {!session && (
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              required
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Your email (not published)"
              required
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        )}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={session ? "Share your thoughts…" : "Sign in or fill in your details to comment"}
          rows={3}
        />
        <div className="mt-4">
          <Captcha
            onVerify={(token) => setCaptchaToken(token)}
            resetNonce={captchaNonce}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {!session && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>{" "}
              for a faster experience
            </p>
          )}
          <Button
            type="submit"
            loading={submitting}
            icon={<Send className="h-4 w-4" />}
            className="ml-auto"
          >
            Post Comment
          </Button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">No comments yet</p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {comments.map((c) => (
              <Fragment key={c.id}>{renderComment(c)}</Fragment>
            ))}
          </div>

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />

          {/* Page info */}
          {totalPages > 1 && (
            <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
              Page {page} of {totalPages} · {totalComments} total comments
            </p>
          )}
        </>
      )}
    </div>
  );
}
