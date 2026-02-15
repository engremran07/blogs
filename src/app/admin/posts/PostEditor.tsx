"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Save,
  Eye,
  ArrowLeft,
  Image as ImageIcon,
  Tag,
  Calendar,
  Globe,
  Lock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import dynamic from "next/dynamic";
import type { MediaItem } from "@/features/media/types";

const RichTextEditor = dynamic(() => import("@/features/editor/ui/RichTextEditor"), { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /> });
const MediaManager = dynamic(() => import("@/features/media/ui/MediaManager").then(m => ({ default: m.MediaManager })), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /> });

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface PostForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  featuredImage: string;
  featuredImageAlt: string;
  seoTitle: string;
  seoDescription: string;
  allowComments: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  tagIds: string[];
  categoryIds: string[];
  isGuestPost: boolean;
  guestAuthorName: string;
  guestAuthorEmail: string;
  guestAuthorBio: string;
  guestAuthorAvatar: string;
  guestAuthorUrl: string;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  parentId: string | null;
}

export default function PostEditor({
  postId,
  isNew,
}: {
  postId?: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [form, setForm] = useState<PostForm>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    status: "DRAFT",
    featuredImage: "",
    featuredImageAlt: "",
    seoTitle: "",
    seoDescription: "",
    allowComments: true,
    isFeatured: false,
    isPinned: false,
    tagIds: [],
    categoryIds: [],
    isGuestPost: false,
    guestAuthorName: "",
    guestAuthorEmail: "",
    guestAuthorBio: "",
    guestAuthorAvatar: "",
    guestAuthorUrl: "",
  });

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d) => setTags(d.data || []));

    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []));

    if (!isNew && postId) {
      fetch(`/api/posts/${postId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            const p = d.data;
            setForm({
              title: p.title || "",
              slug: p.slug || "",
              content: p.content || "",
              excerpt: p.excerpt || "",
              status: p.status || "DRAFT",
              featuredImage: p.featuredImage || "",
              featuredImageAlt: p.featuredImageAlt || "",
              isGuestPost: p.isGuestPost ?? false,
              guestAuthorName: p.guestAuthorName || "",
              guestAuthorEmail: p.guestAuthorEmail || "",
              guestAuthorBio: p.guestAuthorBio || "",
              guestAuthorAvatar: p.guestAuthorAvatar || "",
              guestAuthorUrl: p.guestAuthorUrl || "",
              seoTitle: p.seoTitle || "",
              seoDescription: p.seoDescription || "",
              allowComments: p.allowComments ?? true,
              isFeatured: p.isFeatured ?? false,
              isPinned: p.isPinned ?? false,
              tagIds: (p.tags || []).map((t: TagOption) => t.id),
              categoryIds: (p.categories || []).map((c: CategoryOption) => c.id),
            });
            setAutoSlug(false);
          }
        });
    }
  }, [postId, isNew]);

  function update<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  }

  function toggleTag(id: string) {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((t) => t !== id)
        : [...prev.tagIds, id],
    }));
  }

  function toggleCategory(id: string) {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  }

  async function handleSave(status?: string) {
    if (!form.title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        isGuestPost: form.isGuestPost,
        ...(form.isGuestPost && {
          guestAuthorName: form.guestAuthorName || undefined,
          guestAuthorEmail: form.guestAuthorEmail || undefined,
          guestAuthorBio: form.guestAuthorBio || undefined,
          guestAuthorAvatar: form.guestAuthorAvatar || undefined,
          guestAuthorUrl: form.guestAuthorUrl || undefined,
        }),
        slug: form.slug || slugify(form.title),
        content: form.content,
        excerpt: form.excerpt || undefined,
        status: status || form.status,
        featuredImage: form.featuredImage || undefined,
        featuredImageAlt: form.featuredImageAlt || undefined,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        allowComments: form.allowComments,
        isFeatured: form.isFeatured,
        isPinned: form.isPinned,
        tagIds: form.tagIds,
        categoryIds: form.categoryIds,
      };

      if (status === "PUBLISHED" && !form.content.trim()) {
        toast("Content is required to publish", "error");
        setSaving(false);
        return;
      }

      if (status === "PUBLISHED") {
        body.publishedAt = new Date().toISOString();
      }

      let res: Response;
      if (isNew) {
        body.authorId = (session?.user as { id?: string })?.id;
        body.wordCount = form.content.split(/\s+/).filter(Boolean).length;
        body.readingTime = Math.max(1, Math.ceil((body.wordCount as number) / 200));

        res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        body.wordCount = form.content.split(/\s+/).filter(Boolean).length;
        body.readingTime = Math.max(1, Math.ceil((body.wordCount as number) / 200));

        res = await fetch(`/api/posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.success) {
        toast(isNew ? "Post created!" : "Post saved!", "success");
        if (isNew && data.data?.id) {
          router.push(`/admin/posts/${data.data.id}/edit`);
        }
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save post", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/posts")}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {isNew ? "New Post" : "Edit Post"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave("DRAFT")}
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave("PUBLISHED")}
            loading={saving}
            icon={<Globe className="h-4 w-4" />}
          >
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <Input
              label="Title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Enter post title..."
            />
            <div className="mt-4">
              <Input
                label="Slug"
                value={form.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  update("slug", e.target.value);
                }}
                placeholder="post-url-slug"
                hint="URL-friendly version of the title"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Content
            </label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => update("content", html)}
              onImageUpload={async (file: File) => {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("purpose", "posts");
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || "Upload failed");
                return data.data.url;
              }}
              placeholder="Write your post content here..."
              minHeight="400px"
              maxHeight="800px"
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <Textarea
              label="Excerpt"
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
              placeholder="Brief summary of the post..."
              rows={3}
              hint="Optional. Displayed in post listings and meta descriptions."
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Status</h3>
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
            <div className="mt-4 space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => update("isFeatured", e.target.checked)}
                  className="rounded"
                />
                Featured post
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.isPinned}
                  onChange={(e) => update("isPinned", e.target.checked)}
                  className="rounded"
                />
                Pinned post
              </label>
            </div>
          </div>

          {/* Guest Post */}
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 flex items-center text-sm font-semibold text-gray-900 dark:text-white">
              <Users className="mr-1 inline h-4 w-4" /> Guest Post
            </h3>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-3">
              <input
                type="checkbox"
                checked={form.isGuestPost}
                onChange={(e) => update("isGuestPost", e.target.checked)}
                className="rounded"
              />
              This is a guest post
            </label>
            {form.isGuestPost && (
              <div className="space-y-3">
                <Input
                  label="Guest Author Name"
                  value={form.guestAuthorName}
                  onChange={(e) => update("guestAuthorName", e.target.value)}
                  placeholder="Author's full name"
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.guestAuthorEmail}
                  onChange={(e) => update("guestAuthorEmail", e.target.value)}
                  placeholder="guest@example.com"
                />
                <Input
                  label="Website"
                  value={form.guestAuthorUrl}
                  onChange={(e) => update("guestAuthorUrl", e.target.value)}
                  placeholder="https://guestauthor.com"
                />
                <Input
                  label="Avatar URL"
                  value={form.guestAuthorAvatar}
                  onChange={(e) => update("guestAuthorAvatar", e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                {form.guestAuthorAvatar && (
                  <img src={form.guestAuthorAvatar} alt="Guest avatar" className="mt-1 h-12 w-12 rounded-full object-cover" />
                )}
                <Textarea
                  label="Bio"
                  value={form.guestAuthorBio}
                  onChange={(e) => update("guestAuthorBio", e.target.value)}
                  placeholder="Brief author bio..."
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Featured Image */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              <ImageIcon className="mr-1 inline h-4 w-4" /> Featured Image
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={form.featuredImage}
                  onChange={(e) => update("featuredImage", e.target.value)}
                  placeholder="Image URL..."
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowMediaPicker(true)}
              >
                Browse
              </Button>
            </div>
            {form.featuredImage && (
              <img
                src={form.featuredImage}
                alt="Preview"
                className="mt-3 max-h-48 rounded-lg object-cover"
              />
            )}
            <div className="mt-3">
              <Input
                value={form.featuredImageAlt}
                onChange={(e) => update("featuredImageAlt", e.target.value)}
                placeholder="Alt text for accessibility"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              <Tag className="mr-1 inline h-4 w-4" /> Tags
            </h3>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.tagIds.includes(tag.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-sm text-gray-400">No tags available</p>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
              <Calendar className="mr-1 inline h-4 w-4" /> Categories
            </h3>
            <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={form.categoryIds.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                    className="rounded"
                  />
                  {cat.color && (
                    <span
                      className="inline-block h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                  )}
                  <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-gray-400">No categories available</p>
              )}
            </div>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">SEO</h3>
            <div className="space-y-3">
              <Input
                label="SEO Title"
                value={form.seoTitle}
                onChange={(e) => update("seoTitle", e.target.value)}
                placeholder={form.title || "SEO title..."}
              />
              <Textarea
                label="SEO Description"
                value={form.seoDescription}
                onChange={(e) => update("seoDescription", e.target.value)}
                placeholder="Meta description for search engines..."
                rows={3}
              />
            </div>
            {/* Preview */}
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900">
              <p className="text-xs text-gray-400">Search Preview</p>
              <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-400">
                {form.seoTitle || form.title || "Post Title"}
              </p>
              <p className="text-xs text-green-700 dark:text-green-400">
                myblog.com/blog/{form.slug || "post-slug"}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                {form.seoDescription || form.excerpt || "Post description will appear here..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <Modal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        title="Select Featured Image"
        size="full"
      >
        <div className="h-[70vh]">
          <MediaManager
            mode="picker"
            accept="image/*"
            onSelect={(items: MediaItem[]) => {
              if (items.length > 0) {
                update("featuredImage", items[0].url);
                if (items[0].altText) {
                  update("featuredImageAlt", items[0].altText);
                }
              }
              setShowMediaPicker(false);
            }}
            onUpload={async (file: File) => {
              const formData = new FormData();
              formData.append("file", file);
              const res = await fetch("/api/media", { method: "POST", body: formData });
              const json = await res.json();
              if (!json.success) throw new Error(json.error?.message ?? "Upload failed");
              return json.data;
            }}
            onList={async (filter, sort, page, size) => {
              const params = new URLSearchParams();
              if (filter?.search) params.set("search", filter.search);
              if (filter?.mimeType) params.set("mimeType", filter.mimeType);
              if (filter?.folder) params.set("folder", filter.folder);
              if (sort?.field) params.set("sortField", sort.field);
              if (sort?.direction) params.set("sortDirection", sort.direction);
              if (page) params.set("page", String(page));
              if (size) params.set("pageSize", String(size));
              params.set("mimeType", "image/");
              const res = await fetch(`/api/media?${params}`);
              const json = await res.json();
              if (!json.success) throw new Error(json.error?.message ?? "Failed to load");
              return json.data;
            }}
            onListFolders={async () => {
              const res = await fetch("/api/media/folders");
              const json = await res.json();
              return json.success ? json.data : [];
            }}
            onDelete={async (id: string) => {
              await fetch(`/api/media/${id}`, { method: "DELETE" });
            }}
            onUpdate={async (id: string, data) => {
              const res = await fetch(`/api/media/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
              });
              const json = await res.json();
              if (!json.success) throw new Error(json.error?.message ?? "Update failed");
              return json.data;
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
