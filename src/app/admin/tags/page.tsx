"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Edit2, Trash2, Star, TrendingUp, Lock, Search,
  CheckSquare, Square, ChevronDown, MoreHorizontal, GitMerge, AlertTriangle, ArrowRight,
  ShieldCheck, FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/FormFields";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

interface TagRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children: { id: string; name: string }[];
  synonyms: string[];
  protected: boolean;
  usageCount: number;
  featured: boolean;
  trending: boolean;
  locked: boolean;
}

interface TagSummary { id: string; name: string; slug: string; usageCount: number }
interface DuplicateGroup {
  survivor: TagSummary;
  duplicates: TagSummary[];
  maxScore: number;
}

function slugify(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTag, setEditTag] = useState<TagRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [form, setForm] = useState({ name: "", slug: "", description: "", color: "#3b82f6", metaTitle: "", metaDescription: "", icon: "", ogImage: "", parentId: "", synonyms: "", protected: false });

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

  // Duplicates
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [dupGroups, setDupGroups] = useState<DuplicateGroup[]>([]);
  const [dupLoading, setDupLoading] = useState(false);
  const [dupThreshold, setDupThreshold] = useState(0.6);
  const [merging, setMerging] = useState(false);
  const [excludedGroups, setExcludedGroups] = useState<Set<number>>(new Set());

  useEffect(() => { fetchTags(); }, []);

  async function fetchTags() {
    setLoading(true);
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setTags(data.data || []);
    } catch { toast("Failed to fetch tags", "error"); }
    finally { setLoading(false); }
  }

  function openCreate() { setEditTag(null); setForm({ name: "", slug: "", description: "", color: "#3b82f6", metaTitle: "", metaDescription: "", icon: "", ogImage: "", parentId: "", synonyms: "", protected: false }); setModalOpen(true); }

  function openEdit(tag: TagRow) {
    setEditTag(tag);
    setForm({ name: tag.name, slug: tag.slug, description: tag.description || "", color: tag.color || "#3b82f6", metaTitle: tag.metaTitle || "", metaDescription: tag.metaDescription || "", icon: tag.icon || "", ogImage: tag.ogImage || "", parentId: tag.parentId || "", synonyms: (tag.synonyms || []).join(", "), protected: tag.protected ?? false });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast("Name is required", "error"); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        color: form.color,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
        icon: form.icon || null,
        ogImage: form.ogImage || null,
        parentId: form.parentId || null,
        synonyms: form.synonyms ? form.synonyms.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        protected: form.protected,
      };
      const res = editTag
        ? await fetch(`/api/tags/${editTag.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/tags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { toast(editTag ? "Tag updated!" : "Tag created!", "success"); setModalOpen(false); fetchTags(); }
      else toast(data.error || "Failed to save tag", "error");
    } catch { toast("Failed to save tag", "error"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/tags/${deleteId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast("Tag deleted", "success"); fetchTags(); }
      else toast(data.error || "Failed to delete", "error");
    } catch { toast("Failed to delete tag", "error"); }
    finally { setDeleteId(null); }
  }

  async function toggleFlag(tag: TagRow, field: "featured" | "trending" | "locked" | "protected") {
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: !tag[field] }) });
      const data = await res.json();
      if (data.success) fetchTags();
    } catch { toast("Failed to update", "error"); }
  }

  const filteredTags = tags.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredTags.length / perPage);
  const paginatedTags = filteredTags.slice((page - 1) * perPage, page * perPage);

  // Reset page when search changes
  useEffect(() => { setPage(1); }, [search]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function toggleSelectAll() {
    setSelected(selected.size === filteredTags.length ? new Set() : new Set(filteredTags.map((t) => t.id)));
  }

  async function executeBulkAction() {
    if (!bulkConfirm) return;
    try {
      const res = await fetch("/api/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: bulkConfirm.action, ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (data.success) { toast(data.message, "success"); setSelected(new Set()); fetchTags(); }
      else toast(data.error || "Bulk action failed", "error");
    } catch { toast("Bulk action failed", "error"); }
    finally { setBulkConfirm(null); setBulkMenuOpen(false); }
  }

  // ─── Duplicate detection ──────────────────────────────────────────────

  async function findDuplicates() {
    setDupLoading(true);
    setExcludedGroups(new Set());
    try {
      const res = await fetch("/api/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "groupDuplicates", threshold: dupThreshold }),
      });
      const data = await res.json();
      if (data.success) {
        setDupGroups(data.data || []);
        if ((data.data || []).length === 0) toast("No duplicates found!", "success");
      } else toast(data.error || "Scan failed", "error");
    } catch { toast("Duplicate scan failed", "error"); }
    finally { setDupLoading(false); }
  }

  async function mergeGroup(group: DuplicateGroup) {
    setMerging(true);
    try {
      const res = await fetch("/api/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "merge", sourceIds: group.duplicates.map((d) => d.id), targetId: group.survivor.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast(`Merged into "${group.survivor.name}"`, "success");
        setDupGroups((prev) => prev.filter((g) => g.survivor.id !== group.survivor.id));
        fetchTags();
      } else toast(data.error || "Merge failed", "error");
    } catch { toast("Merge failed", "error"); }
    finally { setMerging(false); }
  }

  async function mergeAllGroups() {
    setMerging(true);
    try {
      const excludeIds = [...excludedGroups].flatMap((i) => {
        const g = dupGroups[i];
        return g ? [g.survivor.id, ...g.duplicates.map((d) => d.id)] : [];
      });
      const res = await fetch("/api/tags/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mergeDuplicates", threshold: dupThreshold, excludeIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast(data.message, "success");
        setDupGroups([]);
        fetchTags();
      } else toast(data.error || "Bulk merge failed", "error");
    } catch { toast("Bulk merge failed", "error"); }
    finally { setMerging(false); }
  }

  const allSelected = filteredTags.length > 0 && selected.size === filteredTags.length;
  const activeGroups = dupGroups.filter((_, i) => !excludedGroups.has(i));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tags.length} tags</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setDupModalOpen(true); if (dupGroups.length === 0) findDuplicates(); }} icon={<GitMerge className="h-4 w-4" />}>
            Find Duplicates
          </Button>
          <Button onClick={openCreate} icon={<Plus className="h-4 w-4" />}>New Tag</Button>
        </div> 
      </div>

      {/* Search + Bulk */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-50 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tags..." className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
        </div>

        {selected.size > 0 && (
          <div className="relative" ref={bulkMenuRef}>
            <Button variant="secondary" onClick={() => setBulkMenuOpen(!bulkMenuOpen)} icon={<MoreHorizontal className="h-4 w-4" />}>
              Bulk ({selected.size}) <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {bulkMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <button onClick={() => setBulkConfirm({ action: "feature", label: "feature" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Star className="h-4 w-4 text-yellow-500" /> Feature</button>
                <button onClick={() => setBulkConfirm({ action: "unfeature", label: "unfeature" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Star className="h-4 w-4 text-gray-400" /> Unfeature</button>
                <button onClick={() => setBulkConfirm({ action: "lock", label: "lock" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Lock className="h-4 w-4 text-red-500" /> Lock</button>
                <button onClick={() => setBulkConfirm({ action: "unlock", label: "unlock" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"><Lock className="h-4 w-4 text-gray-400" /> Unlock</button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button onClick={() => setBulkConfirm({ action: "delete", label: "delete" })} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /> Delete</button>
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
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Tag</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Slug</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Parent</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Posts</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Flags</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" /></td>
                    ))}</tr>
                  ))
                : paginatedTags.map((tag) => (
                    <tr key={tag.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${selected.has(tag.id) ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(tag.id)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                          {selected.has(tag.id) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: tag.color || "#3b82f6" }} />
                          <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{tag.slug}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                        {tag.parent ? (
                          <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 dark:bg-gray-700">
                            <FolderTree className="h-3 w-3" /> {tag.parent.name}
                          </span>
                        ) : (
                          <span className="text-gray-300 dark:text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{tag.usageCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => toggleFlag(tag, "featured")} className={`rounded p-1 ${tag.featured ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"} hover:bg-gray-100 dark:hover:bg-gray-700`} title="Featured"><Star className="h-4 w-4" /></button>
                          <button onClick={() => toggleFlag(tag, "trending")} className={`rounded p-1 ${tag.trending ? "text-green-500" : "text-gray-300 dark:text-gray-600"} hover:bg-gray-100 dark:hover:bg-gray-700`} title="Trending"><TrendingUp className="h-4 w-4" /></button>
                          <button onClick={() => toggleFlag(tag, "locked")} className={`rounded p-1 ${tag.locked ? "text-red-500" : "text-gray-300 dark:text-gray-600"} hover:bg-gray-100 dark:hover:bg-gray-700`} title="Locked"><Lock className="h-4 w-4" /></button>
                          <button onClick={() => toggleFlag(tag, "protected")} className={`rounded p-1 ${tag.protected ? "text-blue-500" : "text-gray-300 dark:text-gray-600"} hover:bg-gray-100 dark:hover:bg-gray-700`} title="Protected"><ShieldCheck className="h-4 w-4" /></button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(tag)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700" title="Edit"><Edit2 className="h-4 w-4" /></button>
                          <button onClick={() => setDeleteId(tag.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && filteredTags.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No tags found</p>}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filteredTags.length)} of {filteredTags.length}</p>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)} className={`rounded px-3 py-1 text-sm ${page === i + 1 ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTag ? "Edit Tag" : "Create Tag"}>
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editTag ? form.slug : slugify(e.target.value) })} placeholder="Tag name" />
          <Input label="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="tag-slug" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Tag description..." rows={3} />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-10 cursor-pointer rounded border-0" />
              <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
          </div>
          <Input label="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icon name or emoji (e.g. 🏷️)" />

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Hierarchy & Relations</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Tag</label>
            <select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">None (top-level)</option>
              {tags.filter((t) => t.id !== editTag?.id).map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          {editTag && (editTag.children?.length ?? 0) > 0 && (
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900">
              <p className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Child Tags</p>
              <div className="flex flex-wrap gap-1">
                {editTag.children.map((c) => (
                  <span key={c.id} className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{c.name}</span>
                ))}
              </div>
            </div>
          )}
          <Input label="Synonyms" value={form.synonyms} onChange={(e) => setForm({ ...form, synonyms: e.target.value })} placeholder="Comma-separated: react, reactjs, react.js" />

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Protection</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.protected} onChange={(e) => setForm({ ...form, protected: e.target.checked })} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Protected tag (cannot be deleted by non-admins)</span>
          </label>

          <hr className="border-gray-200 dark:border-gray-700" />
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">SEO (optional)</p>
          <Input label="Meta Title" value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder="Custom SEO title" />
          <Textarea label="Meta Description" value={form.metaDescription} onChange={(e) => setForm({ ...form, metaDescription: e.target.value })} placeholder="Custom SEO description" rows={2} />
          <Input label="OG Image URL" value={form.ogImage} onChange={(e) => setForm({ ...form, ogImage: e.target.value })} placeholder="https://example.com/image.jpg" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>{editTag ? "Save" : "Create"}</Button>
        </div>
      </Modal>

      {/* ─── Duplicate Finder Modal ─── */}
      <Modal open={dupModalOpen} onClose={() => setDupModalOpen(false)} title="Find & Merge Duplicates">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Similarity Threshold</label>
              <div className="flex items-center gap-2">
                <input type="range" min="0.3" max="1.0" step="0.05" value={dupThreshold} onChange={(e) => setDupThreshold(parseFloat(e.target.value))} className="w-32" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-10">{Math.round(dupThreshold * 100)}%</span>
              </div>
            </div>
            <Button variant="secondary" onClick={findDuplicates} loading={dupLoading} icon={<Search className="h-4 w-4" />}>Scan</Button>
            {activeGroups.length > 0 && (
              <Button onClick={mergeAllGroups} loading={merging} icon={<GitMerge className="h-4 w-4" />}>Merge All ({activeGroups.length})</Button>
            )}
          </div>

          {dupGroups.length === 0 && !dupLoading && (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              <GitMerge className="mx-auto mb-2 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p>No duplicate groups found</p>
              <p className="mt-1 text-xs">Try lowering the similarity threshold</p>
            </div>
          )}

          {dupLoading && (
            <div className="py-8 text-center text-gray-500">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <p>Scanning for duplicates...</p>
            </div>
          )}

          <div className="max-h-96 space-y-3 overflow-y-auto">
            {dupGroups.map((group, gi) => (
              <div key={group.survivor.id} className={`rounded-lg border p-3 transition-opacity ${excludedGroups.has(gi) ? "opacity-40 border-gray-200 dark:border-gray-700" : "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/10"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">{Math.round(group.maxScore * 100)}% match</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{group.duplicates.length + 1} tags</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setExcludedGroups((prev) => { const n = new Set(prev); if (n.has(gi)) n.delete(gi); else n.add(gi); return n; })} className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {excludedGroups.has(gi) ? "Include" : "Skip"}
                    </button>
                    {!excludedGroups.has(gi) && (
                      <button onClick={() => mergeGroup(group)} disabled={merging} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        <GitMerge className="h-3 w-3" /> Merge
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300 ring-1 ring-green-300 dark:ring-green-700">
                    ★ {group.survivor.name} <span className="text-green-600 dark:text-green-400">({group.survivor.usageCount})</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
                  {group.duplicates.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800">
                      {d.name} <span className="text-red-400 dark:text-red-500">({d.usageCount})</span>
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="inline h-3 w-3 mr-0.5" />
                  Posts from duplicates will be reassigned to <strong>{group.survivor.name}</strong>
                </p>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Delete Tag" message="This will remove the tag from all posts." confirmText="Delete" variant="danger" />
      <ConfirmDialog open={!!bulkConfirm} onClose={() => { setBulkConfirm(null); setBulkMenuOpen(false); }} onConfirm={executeBulkAction} title={`Bulk ${bulkConfirm?.label || ""}`} message={`${bulkConfirm?.label} ${selected.size} tag(s)?`} confirmText={bulkConfirm?.action === "delete" ? "Delete All" : "Confirm"} variant={bulkConfirm?.action === "delete" ? "danger" : "primary"} />
    </div>
  );
}
