"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MessageSquare, ThumbsUp, Send, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import Captcha from "@/features/captcha/ui/Captcha";

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

export function CommentSection({ postId }: { postId: string }) {
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
  const [captchaNonce, setCaptchaNonce] = useState(0);

  useEffect(() => {
    fetchComments();
  }, [postId]);

  async function fetchComments() {
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      const data = await res.json();
      if (data.success) {
        // Build tree
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
        setComments(roots);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent, parentId?: string | null) {
    e.preventDefault();
    const text = parentId ? replyContent : content;
    if (!text.trim()) return;

    if (!parentId && !captchaToken) {
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Comment submitted! It will appear after moderation.", "success");
        if (parentId) {
          setReplyContent("");
          setReplyTo(null);
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

  function renderComment(comment: Comment, depth = 0) {
    return (
      <div
        key={comment.id}
        className={`${depth > 0 ? "ml-6 border-l-2 border-gray-100 pl-4 dark:border-gray-700" : ""}`}
      >
        <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <div className="mb-2 flex items-center gap-3">
            <Avatar fallback={comment.authorName} size="sm" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {comment.authorName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(comment.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {comment.content}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400">
              <ThumbsUp className="h-3.5 w-3.5" />
              {comment.upvotes > 0 && comment.upvotes}
            </button>
            <button
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400"
            >
              Reply
            </button>
          </div>

          {replyTo === comment.id && (
            <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-3">
              <Textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                rows={2}
              />
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
        {comment.replies?.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
        <MessageSquare className="h-6 w-6" />
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      <form onSubmit={(e) => handleSubmit(e)} className="mb-8">
        {!session && (
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your name"
              required
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="Your email (not published)"
              required
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        )}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={session ? "Share your thoughts..." : "Sign in or fill in your details to comment"}
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
              <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-gray-500 dark:text-gray-400">
          <MessageSquare className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="space-y-2">{comments.map((c) => renderComment(c))}</div>
      )}
    </div>
  );
}
