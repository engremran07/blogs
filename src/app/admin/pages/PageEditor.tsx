"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Save, ArrowLeft, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { toast } from "@/components/ui/Toast";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/features/editor/ui/RichTextEditor"), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" /> });

function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
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
};

export default function PageEditor({ pageId, isNew }: { pageId?: string; isNew: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(isNew);
  const [seoOpen, setSeoOpen] = useState(false);

  const [form, setForm] = useState<PageForm>({ ...defaultForm });

  useEffect(() => {
    if (!isNew && pageId) {
      fetch(`/api/pages/${pageId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.data) {
            const pg = d.data;
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
              scheduledFor: pg.scheduledFor ? new Date(pg.scheduledFor).toISOString().slice(0, 16) : "",
              parentId: pg.parentId || "",
              sortOrder: pg.sortOrder ?? 0,
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
    if (!form.title.trim()) { toast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        content: form.content,
        excerpt: form.excerpt || undefined,
        status: status || form.status,
        template: form.template,
        visibility: form.visibility,
        // SEO fields
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        ogTitle: form.ogTitle || null,
        ogDescription: form.ogDescription || null,
        ogImage: form.ogImage || null,
        canonicalUrl: form.canonicalUrl || null,
        noIndex: form.noIndex,
        noFollow: form.noFollow,
        // Media
        featuredImage: form.featuredImage || null,
        featuredImageAlt: form.featuredImageAlt || null,
        // Hierarchy
        parentId: form.parentId || null,
        sortOrder: form.sortOrder,
      };

      if (form.scheduledFor) {
        body.scheduledFor = new Date(form.scheduledFor).toISOString();
      }

      if (status === "PUBLISHED") body.publishedAt = new Date().toISOString();

      let res: Response;
      if (isNew) {
        body.authorId = (session?.user as { id?: string })?.id;
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
        toast(isNew ? "Page created!" : "Page saved!", "success");
        router.push("/admin/pages");
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
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave("DRAFT")} loading={saving} icon={<Save className="h-4 w-4" />}>
            Save Draft
          </Button>
          <Button onClick={() => handleSave("PUBLISHED")} loading={saving} icon={<Globe className="h-4 w-4" />}>
            Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <Input label="Title" value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Page title..." />
            <div className="mt-4">
              <Input label="Slug" value={form.slug} onChange={(e) => { setAutoSlug(false); update("slug", e.target.value); }} placeholder="page-slug" />
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => update("content", html)}
              onImageUpload={async (file: File) => {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("purpose", "pages");
                const res = await fetch("/api/upload", { method: "POST", body: fd });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || "Upload failed");
                return data.data.url;
              }}
              placeholder="Write your page content here..."
              minHeight="350px"
              maxHeight="700px"
            />
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <Textarea label="Excerpt" value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} placeholder="Short summary..." rows={3} />
          </div>

          {/* SEO Section */}
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <button
              onClick={() => setSeoOpen(!seoOpen)}
              className="flex w-full items-center justify-between p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white">SEO Settings</h3>
              {seoOpen ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </button>
            {seoOpen && (
              <div className="space-y-4 border-t border-gray-200 p-6 dark:border-gray-700">
                <Input label="Meta Title" value={form.metaTitle} onChange={(e) => update("metaTitle", e.target.value)} placeholder="SEO title (max 100 chars)" maxLength={100} />
                <Textarea label="Meta Description" value={form.metaDescription} onChange={(e) => update("metaDescription", e.target.value)} placeholder="SEO description (max 200 chars)" rows={2} maxLength={200} />
                <Input label="OG Title" value={form.ogTitle} onChange={(e) => update("ogTitle", e.target.value)} placeholder="Open Graph title" maxLength={100} />
                <Textarea label="OG Description" value={form.ogDescription} onChange={(e) => update("ogDescription", e.target.value)} placeholder="Open Graph description" rows={2} maxLength={200} />
                <Input label="OG Image URL" value={form.ogImage} onChange={(e) => update("ogImage", e.target.value)} placeholder="https://..." />
                <Input label="Canonical URL" value={form.canonicalUrl} onChange={(e) => update("canonicalUrl", e.target.value)} placeholder="https://..." />
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.noIndex} onChange={(e) => update("noIndex", e.target.checked)} className="rounded" />
                    noindex
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={form.noFollow} onChange={(e) => update("noFollow", e.target.checked)} className="rounded" />
                    nofollow
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Settings</h3>
            <Select label="Status" value={form.status} onChange={(e) => update("status", e.target.value)}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
            <div className="mt-4">
              <Select label="Template" value={form.template} onChange={(e) => update("template", e.target.value)}>
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
              <Select label="Visibility" value={form.visibility} onChange={(e) => update("visibility", e.target.value)}>
                <option value="PUBLIC">Public</option>
                <option value="PRIVATE">Private</option>
                <option value="PASSWORD_PROTECTED">Password Protected</option>
                <option value="LOGGED_IN_ONLY">Logged In Only</option>
              </Select>
            </div>
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
                onChange={(e) => update("sortOrder", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Featured Image</h3>
            <Input label="Image URL" value={form.featuredImage} onChange={(e) => update("featuredImage", e.target.value)} placeholder="https://..." />
            <div className="mt-3">
              <Input label="Alt Text" value={form.featuredImageAlt} onChange={(e) => update("featuredImageAlt", e.target.value)} placeholder="Image description..." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
