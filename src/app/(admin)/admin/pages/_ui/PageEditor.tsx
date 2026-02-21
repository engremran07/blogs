"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Save,
  ArrowLeft,
  Globe,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Code,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { EditorStatusProvider } from "@/components/admin/EditorContext";
import TagAutocomplete from "@/components/admin/TagAutocomplete";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { MediaItem } from "@/features/media/types";

const RichTextEditor = dynamic(() => import("@/features/editor"), {
  ssr: false,
  loading: () => (
    <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
  ),
});
const MediaManager = dynamic(
  () =>
    import("@/features/media/ui/MediaManager").then((m) => ({
      default: m.MediaManager,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  },
);

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

interface PageForm {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  template: string;
  visibility: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  noIndex: boolean;
  noFollow: boolean;
  // Media
  featuredImage: string;
  featuredImageAlt: string;
  // Scheduling
  scheduledFor: string;
  // Hierarchy
  parentId: string;
  sortOrder: number;
  // Visibility guard
  password: string;
  // Code injection
  customCss: string;
  customJs: string;
  customHead: string;
  // Tags
  tagIds: string[];
  // Metrics (computed)
  wordCount: number;
  readingTime: number;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

const defaultForm: PageForm = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  status: "DRAFT",
  template: "DEFAULT",
  visibility: "PUBLIC",
  metaTitle: "",
  metaDescription: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  canonicalUrl: "",
  noIndex: false,
  noFollow: false,
  featuredImage: "",
  featuredImageAlt: "",
  scheduledFor: "",
  parentId: "",
  sortOrder: 0,
  password: "",
  customCss: "",
  customJs: "",
  customHead: "",
  tagIds: [],
  wordCount: 0,
  readingTime: 0,
};

export default function PageEditor({
  pageId,
  isNew,
}: {
  pageId?: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [seoOpen, setSeoOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);

  const [form, setForm] = useState<PageForm>({ ...defaultForm });

  // Ref always points to the latest form so async handlers never see stale state
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    if (!isNew && pageId) {
      fetch(`/api/pages/${pageId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            const pg = d.data;
            const pageTags = (pg.tags || []).map((t: TagItem) => ({
              id: t.id,
              name: t.name,
              slug: t.slug,
            }));
            setSelectedTags(pageTags);
            setForm({
              title: pg.title || "",
              slug: pg.slug || "",
              content: pg.content || "",
              excerpt: pg.excerpt || "",
              status: pg.status || "DRAFT",
              template: pg.template || "DEFAULT",
              visibility: pg.visibility || "PUBLIC",
              metaTitle: pg.metaTitle || "",
              metaDescription: pg.metaDescription || "",
              ogTitle: pg.ogTitle || "",
              ogDescription: pg.ogDescription || "",
              ogImage: pg.ogImage || "",
              canonicalUrl: pg.canonicalUrl || "",
              noIndex: pg.noIndex ?? false,
              noFollow: pg.noFollow ?? false,
              featuredImage: pg.featuredImage || "",
              featuredImageAlt: pg.featuredImageAlt || "",
              scheduledFor: pg.scheduledFor
                ? new Date(pg.scheduledFor).toISOString().slice(0, 16)
                : "",
              parentId: pg.parentId || "",
              sortOrder: pg.sortOrder ?? 0,
              password: pg.password || "",
              customCss: pg.customCss || "",
              customJs: pg.customJs || "",
              customHead: pg.customHead || "",
              tagIds: pageTags.map((t: TagItem) => t.id),
              wordCount: pg.wordCount ?? 0,
              readingTime: pg.readingTime ?? 0,
            });
            setAutoSlug(false);
          }
        });
    }
  }, [pageId, isNew]);

  function update<K extends keyof PageForm>(key: K, value: PageForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && autoSlug) next.slug = slugify(value as string);
      return next;
    });
  }

  async function handleSave(status?: string) {
    // Read from ref to guarantee latest state (avoids stale closures from
    // React-Compiler auto-memoisation or batched state updates).
    const f = formRef.current;
    if (!f.title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: f.title,
        content: f.content,
        excerpt: f.excerpt || undefined,
        status: status || f.status,
        template: f.template,
        visibility: f.visibility,
        // SEO fields
        metaTitle: f.metaTitle || null,
        metaDescription: f.metaDescription || null,
        ogTitle: f.ogTitle || null,
        ogDescription: f.ogDescription || null,
        ogImage: f.ogImage || null,
        canonicalUrl: f.canonicalUrl || null,
        noIndex: f.noIndex,
        noFollow: f.noFollow,
        // Media
        featuredImage: f.featuredImage || null,
        featuredImageAlt: f.featuredImageAlt || null,
        // Hierarchy
        parentId: f.parentId || null,
        sortOrder: f.sortOrder,
        // Visibility guard
        password:
          f.visibility === "PASSWORD_PROTECTED"
            ? f.password || null
            : null,
        // Code injection
        customCss: f.customCss || null,
        customJs: f.customJs || null,
        customHead: f.customHead || null,
        // Tags
        tagIds: f.tagIds,
        // Metrics
        wordCount: f.wordCount,
        readingTime: f.readingTime,
      };

      if (f.scheduledFor) {
        body.scheduledFor = new Date(f.scheduledFor).toISOString();
      }

      if (status === "PUBLISHED") body.publishedAt = new Date().toISOString();

      let res: Response;
      if (isNew) {
        body.authorId = session?.user?.id;
        res = await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();
      if (data.success) {
        setLastSavedAt(new Date().toISOString());
        toast(isNew ? "Page created!" : "Page saved!", "success");
        if (isNew && data.data?.slug) {
          router.push(`/admin/pages/${data.data.slug}/edit`);
        }
      } else {
        toast(data.error || "Failed to save", "error");
      }
    } catch {
      toast("Failed to save page", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorStatusProvider
      value={{
        status: form.status,
        isDirty: false,
        slug: form.slug || null,
        title: form.title,
        pageId: pageId ?? null,
        wordCount: form.wordCount,
        readingTime: form.readingTime,
        lastSavedAt,
        handleSave,
      }}
    >
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/pages")}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {isNew ? "New Page" : "Edit Page"}
            </h1>
            {!isNew && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {form.wordCount} words &middot; {form.readingTime} min read
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!isNew && (
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                icon={<Eye className="h-4 w-4" />}
              >
                Preview
              </Button>
            )}
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
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Page title..."
              />
              <div className="mt-4">
                <Input
                  label="Slug"
                  value={form.slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    update("slug", e.target.value);
                  }}
                  placeholder="page-slug"
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
                onChange={(html, _text, wc) => {
                  update("content", html);
                  const wordCount = wc ?? 0;
                  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
                  setForm((prev) => ({ ...prev, wordCount, readingTime }));
                }}
                onImageUpload={async (file: File) => {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("purpose", "pages");
                  const res = await fetch("/api/upload", {
                    method: "POST",
                    body: fd,
                  });
                  const data = await res.json();
                  if (!data.success)
                    throw new Error(data.error || "Upload failed");
                  return data.data.url;
                }}
                placeholder="Write your page content here..."
                minHeight="400px"
                maxHeight="800px"
              />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <Textarea
                label="Excerpt"
                value={form.excerpt}
                onChange={(e) => update("excerpt", e.target.value)}
                placeholder="Short summary..."
                rows={3}
                hint="Optional. Used in page listings and meta descriptions."
              />
            </div>

            {/* SEO Section */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => setSeoOpen(!seoOpen)}
                className="flex w-full items-center justify-between p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  SEO Settings
                </h3>
                {seoOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {seoOpen && (
                <div className="space-y-4 border-t border-gray-200 p-6 dark:border-gray-700">
                  <Input
                    label="Meta Title"
                    value={form.metaTitle}
                    onChange={(e) => update("metaTitle", e.target.value)}
                    placeholder="SEO title (max 100 chars)"
                    maxLength={100}
                  />
                  <Textarea
                    label="Meta Description"
                    value={form.metaDescription}
                    onChange={(e) => update("metaDescription", e.target.value)}
                    placeholder="SEO description (max 200 chars)"
                    rows={2}
                    maxLength={200}
                  />
                  <Input
                    label="OG Title"
                    value={form.ogTitle}
                    onChange={(e) => update("ogTitle", e.target.value)}
                    placeholder="Open Graph title"
                    maxLength={100}
                  />
                  <Textarea
                    label="OG Description"
                    value={form.ogDescription}
                    onChange={(e) => update("ogDescription", e.target.value)}
                    placeholder="Open Graph description"
                    rows={2}
                    maxLength={200}
                  />
                  <Input
                    label="OG Image URL"
                    value={form.ogImage}
                    onChange={(e) => update("ogImage", e.target.value)}
                    placeholder="https://..."
                  />
                  <Input
                    label="Canonical URL"
                    value={form.canonicalUrl}
                    onChange={(e) => update("canonicalUrl", e.target.value)}
                    placeholder="https://..."
                  />
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.noIndex}
                        onChange={(e) => update("noIndex", e.target.checked)}
                        className="rounded"
                      />
                      noindex
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={form.noFollow}
                        onChange={(e) => update("noFollow", e.target.checked)}
                        className="rounded"
                      />
                      nofollow
                    </label>
                  </div>
                  {/* SEO Preview */}
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900">
                    <p className="text-xs text-gray-400">Search Preview</p>
                    <p className="mt-1 text-sm font-medium text-blue-700 dark:text-blue-400">
                      {form.metaTitle || form.title || "Page Title"}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      myblog.com/{form.slug || "page-slug"}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {form.metaDescription ||
                        form.excerpt ||
                        "Page description will appear here..."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Code Injection Section */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <button
                onClick={() => setCodeOpen(!codeOpen)}
                className="flex w-full items-center justify-between p-6"
              >
                <h3 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                  <Code className="h-4 w-4" /> Code Injection
                </h3>
                {codeOpen ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </button>
              {codeOpen && (
                <div className="space-y-4 border-t border-gray-200 p-6 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add custom CSS, JavaScript, or HTML head tags to this page
                    only.
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Custom CSS
                    </label>
                    <textarea
                      value={form.customCss}
                      onChange={(e) => update("customCss", e.target.value)}
                      placeholder=".my-class { color: red; }"
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 bg-gray-900 p-3 font-mono text-sm text-green-400 placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Custom JavaScript
                    </label>
                    <textarea
                      value={form.customJs}
                      onChange={(e) => update("customJs", e.target.value)}
                      placeholder="console.log('Hello from page');"
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 bg-gray-900 p-3 font-mono text-sm text-green-400 placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Custom Head Tags
                    </label>
                    <textarea
                      value={form.customHead}
                      onChange={(e) => update("customHead", e.target.value)}
                      placeholder='<meta name="custom" content="value" />'
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 bg-gray-900 p-3 font-mono text-sm text-green-400 placeholder-gray-600 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600"
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Settings */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Settings
              </h3>
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
              <div className="mt-4">
                <Select
                  label="Template"
                  value={form.template}
                  onChange={(e) => update("template", e.target.value)}
                >
                  <option value="DEFAULT">Default</option>
                  <option value="FULL_WIDTH">Full Width</option>
                  <option value="SIDEBAR_LEFT">Sidebar Left</option>
                  <option value="SIDEBAR_RIGHT">Sidebar Right</option>
                  <option value="LANDING">Landing</option>
                  <option value="BLANK">Blank</option>
                  <option value="CUSTOM">Custom</option>
                </Select>
              </div>
              <div className="mt-4">
                <Select
                  label="Visibility"
                  value={form.visibility}
                  onChange={(e) => update("visibility", e.target.value)}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="PASSWORD_PROTECTED">Password Protected</option>
                  <option value="LOGGED_IN_ONLY">Logged In Only</option>
                </Select>
              </div>
              {form.visibility === "PASSWORD_PROTECTED" && (
                <div className="mt-4">
                  <Input
                    label="Page Password"
                    type="password"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Enter password..."
                    hint="Visitors must enter this password to view the page"
                  />
                </div>
              )}
              {form.status === "SCHEDULED" && (
                <div className="mt-4">
                  <Input
                    label="Scheduled For"
                    type="datetime-local"
                    value={form.scheduledFor}
                    onChange={(e) => update("scheduledFor", e.target.value)}
                  />
                </div>
              )}
              <div className="mt-4">
                <Input
                  label="Sort Order"
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) =>
                    update("sortOrder", parseInt(e.target.value) || 0)
                  }
                />
              </div>
            </div>

            {/* Featured Image with MediaManager */}
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
                <Image
                  src={form.featuredImage}
                  alt="Preview"
                  className="mt-3 max-h-48 rounded-lg object-cover"
                  width={400}
                  height={192}
                  unoptimized
                />
              )}
              <div className="mt-3">
                <Input
                  label="Alt Text"
                  value={form.featuredImageAlt}
                  onChange={(e) => update("featuredImageAlt", e.target.value)}
                  placeholder="Image description for accessibility..."
                />
              </div>
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                Tags
              </h3>
              <TagAutocomplete
                selectedTagIds={form.tagIds}
                selectedTags={selectedTags}
                onTagsChange={(tagIds, tags) => {
                  setForm((prev) => ({ ...prev, tagIds }));
                  setSelectedTags(tags);
                }}
                placeholder="Search tags..."
              />
            </div>

            {/* Page Info */}
            {!isNew && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">
                  Page Info
                </h3>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Words</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {form.wordCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reading time</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {form.readingTime} min
                    </span>
                  </div>
                </div>
              </div>
            )}
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
                const res = await fetch("/api/media", {
                  method: "POST",
                  body: formData,
                });
                const json = await res.json();
                if (!json.success)
                  throw new Error(json.error?.message ?? "Upload failed");
                return json.data;
              }}
              onList={async (filter, sort, page, size) => {
                const params = new URLSearchParams();
                if (filter?.search) params.set("search", filter.search);
                if (filter?.mimeType) params.set("mimeType", filter.mimeType);
                if (filter?.folder) params.set("folder", filter.folder);
                if (sort?.field) params.set("sortField", sort.field);
                if (sort?.direction)
                  params.set("sortDirection", sort.direction);
                if (page) params.set("page", String(page));
                if (size) params.set("pageSize", String(size));
                params.set("mimeType", "image/");
                const res = await fetch(`/api/media?${params}`);
                const json = await res.json();
                if (!json.success)
                  throw new Error(json.error?.message ?? "Failed to load");
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
                if (!json.success)
                  throw new Error(json.error?.message ?? "Update failed");
                return json.data;
              }}
            />
          </div>
        </Modal>

        {/* Preview Modal */}
        <Modal
          open={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Preview: ${form.title || "Untitled"}`}
          size="full"
        >
          <div className="mx-auto max-w-3xl p-8">
            <article className="prose prose-lg prose-blue dark:prose-invert max-w-none">
              <h1>{form.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: form.content }} />
            </article>
            {form.customCss && (
              <style dangerouslySetInnerHTML={{ __html: form.customCss }} />
            )}
          </div>
        </Modal>
      </div>
    </EditorStatusProvider>
  );
}
