"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  FolderTree,
  Star,
  GripVertical,
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Palette,
  Save,
  CheckSquare,
  Square,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/FormFields";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";

/* ───────────────────────── Types ───────────────────────── */

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  image: string | null;
  featured: boolean;
  sortOrder: number;
  parentId: string | null;
  postCount: number;
  children?: Category[];
}

type DropPosition = "before" | "after" | "child";

interface CategoryForm {
  name: string;
  description: string;
  color: string;
  icon: string;
  image: string;
  featured: boolean;
  sortOrder: number;
  parentId: string;
}

const PRESET_COLORS = [
  "#3B82F6",
  "#EF4444",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#6366F1",
  "#14B8A6",
  "#84CC16",
  "#E11D48",
];

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  color: "",
  icon: "",
  image: "",
  featured: false,
  sortOrder: 0,
  parentId: "",
};

/* ───────────────────────── Component ───────────────────── */

export default function CategoriesPage() {
  const [tree, setTree] = useState<Category[]>([]);
  const [flat, setFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /* ─── Bulk selection ─── */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<{
    action: string;
    label: string;
  } | null>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  /* ─── Drag & drop state ─── */
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);
  const [reorderDirty, setReorderDirty] = useState(false);
  const [reordering, setReordering] = useState(false);
  const dragCounter = useRef(0);

  /* ─── Fetch ─── */

  const fetchCategories = useCallback(async () => {
    try {
      const [treeRes, flatRes] = await Promise.all([
        fetch("/api/categories?tree=true"),
        fetch("/api/categories"),
      ]);
      if (!treeRes.ok || !flatRes.ok) {
        toast("Failed to load categories", "error");
        return;
      }
      const treeData = await treeRes.json();
      const flatData = await flatRes.json();
      if (treeData.success) setTree(treeData.data);
      if (flatData.success) setFlat(flatData.data);
    } catch {
      toast("Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* ─── Close bulk menu on click outside ─── */
  useEffect(() => {
    if (!bulkMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        bulkMenuRef.current &&
        !bulkMenuRef.current.contains(e.target as Node)
      )
        setBulkMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [bulkMenuOpen]);

  /* ─── Bulk selection helpers ─── */

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    const allIds = flat.map((c) => c.id);
    setSelected(selected.size === allIds.length ? new Set() : new Set(allIds));
  }

  async function executeBulkAction() {
    if (!bulkConfirm) return;
    try {
      const res = await fetch("/api/categories/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: bulkConfirm.action,
          ids: Array.from(selected),
        }),
      });
      if (!res.ok) {
        toast("Bulk action failed", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast(data.message, "success");
        setSelected(new Set());
        fetchCategories();
      } else toast(data.error || "Bulk action failed", "error");
    } catch {
      toast("Bulk action failed", "error");
    } finally {
      setBulkConfirm(null);
      setBulkMenuOpen(false);
    }
  }

  /* ─── Expand / Collapse ─── */

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* ─── Flatten tree helper ─── */

  function flattenTree(
    cats: Category[],
    parentId: string | null = null,
  ): { id: string; parentId: string | null; sortOrder: number }[] {
    const result: { id: string; parentId: string | null; sortOrder: number }[] =
      [];
    cats.forEach((cat, index) => {
      result.push({ id: cat.id, parentId, sortOrder: index });
      if (cat.children?.length) {
        result.push(...flattenTree(cat.children, cat.id));
      }
    });
    return result;
  }

  /* ─── Tree mutation helpers ─── */

  function removeCatFromTree(
    cats: Category[],
    id: string,
  ): { tree: Category[]; removed: Category | null } {
    let removed: Category | null = null;
    const filtered = cats.reduce<Category[]>((acc, cat) => {
      if (cat.id === id) {
        removed = { ...cat };
        return acc;
      }
      const clone = { ...cat };
      if (clone.children?.length) {
        const childResult = removeCatFromTree(clone.children, id);
        clone.children = childResult.tree;
        if (childResult.removed) removed = childResult.removed;
      }
      acc.push(clone);
      return acc;
    }, []);
    return { tree: filtered, removed };
  }

  function insertCatInTree(
    cats: Category[],
    targetId: string,
    position: DropPosition,
    category: Category,
  ): Category[] {
    if (position === "child") {
      return cats.map((cat) => {
        if (cat.id === targetId) {
          return {
            ...cat,
            children: [
              ...(cat.children || []),
              { ...category, children: category.children || [] },
            ],
          };
        }
        if (cat.children?.length) {
          return {
            ...cat,
            children: insertCatInTree(
              cat.children,
              targetId,
              position,
              category,
            ),
          };
        }
        return cat;
      });
    }

    // before / after
    const result: Category[] = [];
    for (const cat of cats) {
      if (cat.id === targetId && position === "before") {
        result.push({ ...category, children: category.children || [] });
      }
      if (cat.children?.length) {
        result.push({
          ...cat,
          children: insertCatInTree(cat.children, targetId, position, category),
        });
      } else {
        result.push(cat);
      }
      if (cat.id === targetId && position === "after") {
        result.push({ ...category, children: category.children || [] });
      }
    }
    return result;
  }

  function isDescendant(
    cats: Category[],
    parentId: string,
    childId: string,
  ): boolean {
    for (const cat of cats) {
      if (cat.id === parentId) {
        return containsCat(cat.children || [], childId);
      }
      if (cat.children?.length && isDescendant(cat.children, parentId, childId))
        return true;
    }
    return false;
  }

  function containsCat(cats: Category[], id: string): boolean {
    for (const cat of cats) {
      if (cat.id === id) return true;
      if (cat.children?.length && containsCat(cat.children, id)) return true;
    }
    return false;
  }

  /* ─── Drag handlers ─── */

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDragId(id);
  }

  function handleDragEnd() {
    setDragId(null);
    setDropTarget(null);
    dragCounter.current = 0;
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!dragId || dragId === targetId) return;

    // Don't allow dropping onto a descendant
    if (isDescendant(tree, dragId, targetId)) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position: DropPosition;
    if (y < height * 0.25) {
      position = "before";
    } else if (y > height * 0.75) {
      position = "after";
    } else {
      position = "child";
    }

    setDropTarget({ id: targetId, position });
  }

  function handleDragLeave(_e: React.DragEvent) {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setDropTarget(null);
      dragCounter.current = 0;
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    dragCounter.current = 0;

    if (!dragId || dragId === targetId) {
      setDropTarget(null);
      setDragId(null);
      return;
    }

    if (isDescendant(tree, dragId, targetId)) {
      setDropTarget(null);
      setDragId(null);
      return;
    }

    const position = dropTarget?.position || "after";

    // Remove dragged item from tree
    const { tree: treeWithout, removed } = removeCatFromTree(tree, dragId);
    if (!removed) return;

    // Insert at new position
    const newTree = insertCatInTree(treeWithout, targetId, position, removed);
    setTree(newTree);
    setReorderDirty(true);

    // If dropped as child, expand the parent
    if (position === "child") {
      setExpanded((prev) => new Set([...prev, targetId]));
    }

    setDropTarget(null);
    setDragId(null);
  }

  /* ─── Move up/down within siblings ─── */

  function moveCat(id: string, direction: "up" | "down") {
    function moveInList(cats: Category[]): Category[] {
      const idx = cats.findIndex((c) => c.id === id);
      if (idx !== -1) {
        const newIdx = direction === "up" ? idx - 1 : idx + 1;
        if (newIdx < 0 || newIdx >= cats.length) return cats;
        const clone = [...cats];
        [clone[idx], clone[newIdx]] = [clone[newIdx], clone[idx]];
        return clone;
      }
      return cats.map((cat) =>
        cat.children?.length
          ? { ...cat, children: moveInList(cat.children) }
          : cat,
      );
    }
    setTree((prev) => moveInList(prev));
    setReorderDirty(true);
  }

  /* ─── Reparent: make a root cat a child, or promote to root ─── */

  function makeChild(id: string) {
    const { tree: treeWithout, removed } = removeCatFromTree(tree, id);
    if (!removed) return;
    // Find siblings: look for the cat before it in the original tree
    const siblings = findSiblings(tree, id);
    const idx = siblings.findIndex((c) => c.id === id);
    const newParent = siblings[idx - 1] || siblings[idx + 1];
    if (!newParent) return;
    const newTree = insertCatInTree(
      treeWithout,
      newParent.id,
      "child",
      removed,
    );
    setTree(newTree);
    setExpanded((prev) => new Set([...prev, newParent.id]));
    setReorderDirty(true);
  }

  function findSiblings(cats: Category[], id: string): Category[] {
    for (const cat of cats) {
      if (cat.id === id) return cats;
      if (cat.children?.length) {
        const found = findSiblings(cat.children, id);
        if (found.length) return found;
      }
    }
    return [];
  }

  /* ─── Save reorder ─── */

  async function saveReorder() {
    setReordering(true);
    try {
      const items = flattenTree(tree);
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        toast("Failed to save order", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast("Category order saved!", "success");
        setReorderDirty(false);
        fetchCategories();
      } else {
        toast(data.error || "Failed to save order", "error");
      }
    } catch {
      toast("Failed to save order", "error");
    } finally {
      setReordering(false);
    }
  }

  /* ─── Open create / edit modal ─── */

  function openCreate(parentId?: string) {
    setEditingId(null);
    setForm({ ...emptyForm, parentId: parentId || "" });
    setModalOpen(true);
  }

  function openEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description || "",
      color: cat.color || "",
      icon: cat.icon || "",
      image: cat.image || "",
      featured: cat.featured,
      sortOrder: cat.sortOrder,
      parentId: cat.parentId || "",
    });
    setModalOpen(true);
  }

  /* ─── Save (create or update) ─── */

  async function handleSave() {
    if (!form.name.trim()) {
      toast("Name is required", "error");
      return;
    }

    // Detect comma-separated names for bulk creation (only in create mode)
    const isBulk = !editingId && form.name.includes(",");
    const names = isBulk
      ? form.name
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
      : [];

    if (isBulk && names.length < 2) {
      // Single name with trailing comma — treat as single
    }

    setSaving(true);
    try {
      if (isBulk && names.length >= 2) {
        // ── Bulk creation ──
        const body: Record<string, unknown> = {
          names: form.name,
          description: form.description || null,
          color: form.color || null,
          icon: form.icon || null,
          image: form.image || null,
          featured: form.featured,
          parentId: form.parentId || null,
        };

        const res = await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast("Failed to create categories", "error");
          return;
        }
        const data = await res.json();

        if (data.success) {
          const created = data.meta?.created ?? data.data?.length ?? 0;
          const failed = data.meta?.failed ?? 0;
          if (failed > 0) {
            toast(
              `Created ${created} categories, ${failed} failed: ${(data.meta?.errors || []).join("; ")}`,
              "warning",
            );
          } else {
            toast(`${created} categories created!`, "success");
          }
          setModalOpen(false);
          fetchCategories();
        } else {
          toast(data.error || "Failed to create categories", "error");
        }
      } else {
        // ── Single creation / update ──
        const body: Record<string, unknown> = {
          name: form.name,
          description: form.description || null,
          color: form.color || null,
          icon: form.icon || null,
          image: form.image || null,
          featured: form.featured,
          sortOrder: form.sortOrder,
          parentId: form.parentId || null,
        };

        const url = editingId
          ? `/api/categories/${editingId}`
          : `/api/categories`;
        const method = editingId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast("Failed to save category", "error");
          return;
        }
        const data = await res.json();

        if (data.success) {
          toast(
            editingId ? "Category updated!" : "Category created!",
            "success",
          );
          setModalOpen(false);
          fetchCategories();
        } else {
          toast(data.error || "Failed to save", "error");
        }
      }
    } catch {
      toast("Failed to save category", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Delete ─── */

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/categories/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast("Failed to delete category", "error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        toast("Category deleted", "success");
        fetchCategories();
      } else {
        toast(data.error || "Failed to delete", "error");
      }
    } catch {
      toast("Failed to delete category", "error");
    } finally {
      setDeleteId(null);
    }
  }

  /* ─── Build parent options (excluding self + descendants) ─── */

  function getParentOptions(): { id: string; name: string; depth: number }[] {
    const options: { id: string; name: string; depth: number }[] = [];

    function walk(cats: Category[], depth: number) {
      for (const cat of cats) {
        if (cat.id !== editingId) {
          options.push({ id: cat.id, name: cat.name, depth });
          if (cat.children?.length) walk(cat.children, depth + 1);
        }
      }
    }
    walk(tree, 0);
    return options;
  }

  /* ─── Count total categories ─── */

  function countAll(cats: Category[]): number {
    let c = cats.length;
    for (const cat of cats)
      if (cat.children?.length) c += countAll(cat.children);
    return c;
  }

  /* ─── Render tree node ─── */

  function renderNode(cat: Category, depth: number) {
    const hasChildren = (cat.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(cat.id);
    const isDragging = dragId === cat.id;
    const isDropTarget = dropTarget?.id === cat.id;
    const dropPos = isDropTarget ? dropTarget.position : null;

    return (
      <div key={cat.id}>
        {/* Drop indicator: before */}
        {isDropTarget && dropPos === "before" && (
          <div
            className="mx-3 h-0.5 rounded bg-primary"
            style={{
              marginLeft: depth > 0 ? `${depth * 24 + 12}px` : undefined,
            }}
          />
        )}

        <div
          draggable
          onDragStart={(e) => handleDragStart(e, cat.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => handleDragOver(e, cat.id)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, cat.id)}
          className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 transition-colors ${
            depth > 0
              ? "ml-6 border-l-2 border-gray-200 dark:border-gray-700"
              : ""
          } ${isDragging ? "opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-700/50"} ${
            isDropTarget && dropPos === "child"
              ? "ring-2 ring-primary ring-inset bg-primary/5 dark:bg-primary/10"
              : ""
          }`}
        >
          {/* Bulk checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(cat.id);
            }}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:text-primary dark:text-gray-500 dark:hover:text-primary"
            title={selected.has(cat.id) ? "Deselect" : "Select"}
          >
            {selected.has(cat.id) ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </button>

          {/* Drag handle */}
          <button
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 active:cursor-grabbing"
            onMouseDown={(e) => e.stopPropagation()}
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Expand toggle */}
          <button
            onClick={() => hasChildren && toggleExpand(cat.id)}
            className={`shrink-0 rounded p-0.5 ${
              hasChildren
                ? "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                : "invisible"
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>

          {/* Color swatch */}
          <div
            className="h-4 w-4 shrink-0 rounded-full border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: cat.color || "#9CA3AF" }}
          />

          {/* Name & slug */}
          <div className="min-w-0 flex-1">
            <span className="font-medium text-gray-900 dark:text-white">
              {cat.name}
            </span>
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
              /{cat.slug}
            </span>
          </div>

          {/* Badges */}
          {cat.featured && (
            <Star
              className="h-4 w-4 shrink-0 text-amber-500"
              fill="currentColor"
            />
          )}
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {cat.postCount} posts
          </span>

          {/* Reorder + Actions */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => moveCat(cat.id, "up")}
              title="Move up"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => moveCat(cat.id, "down")}
              title="Move down"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            {depth === 0 && findSiblings(tree, cat.id).length > 1 && (
              <button
                onClick={() => makeChild(cat.id)}
                title="Make child of sibling"
                className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
              >
                <CornerDownRight className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="mx-0.5 h-4 w-px bg-gray-200 dark:bg-gray-600" />
            <button
              onClick={() => openCreate(cat.id)}
              title="Add child"
              className="rounded p-1 text-gray-400 hover:bg-primary/5 hover:text-primary dark:hover:bg-primary/10 dark:hover:text-primary"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              onClick={() => openEdit(cat)}
              title="Edit"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteId(cat.id)}
              title="Delete"
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Drop indicator: after */}
        {isDropTarget && dropPos === "after" && (
          <div
            className="mx-3 h-0.5 rounded bg-primary"
            style={{
              marginLeft: depth > 0 ? `${depth * 24 + 12}px` : undefined,
            }}
          />
        )}

        {/* Children */}
        {isExpanded &&
          cat.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  /* ─── Main render ─── */

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const deleteCat = flat.find((c) => c.id === deleteId);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FolderTree className="mr-2 inline h-6 w-6" />
            Categories
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {countAll(tree)} categories &middot; Drag to reorder or reparent
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Select All / Deselect All */}
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            title={
              selected.size === flat.length ? "Deselect All" : "Select All"
            }
          >
            {selected.size === flat.length && flat.length > 0 ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selected.size === flat.length && flat.length > 0
              ? "Deselect All"
              : "Select All"}
          </button>

          {/* Bulk actions dropdown */}
          {selected.size > 0 && (
            <div className="relative" ref={bulkMenuRef}>
              <Button
                variant="secondary"
                onClick={() => setBulkMenuOpen(!bulkMenuOpen)}
                icon={<MoreHorizontal className="h-4 w-4" />}
              >
                Bulk ({selected.size}) <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
              {bulkMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <button
                    onClick={() =>
                      setBulkConfirm({ action: "feature", label: "feature" })
                    }
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Star className="h-4 w-4 text-yellow-500" /> Feature
                  </button>
                  <button
                    onClick={() =>
                      setBulkConfirm({
                        action: "unfeature",
                        label: "unfeature",
                      })
                    }
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <Star className="h-4 w-4 text-gray-400" /> Unfeature
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() =>
                      setBulkConfirm({ action: "delete", label: "delete" })
                    }
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}

          {reorderDirty && (
            <Button
              onClick={saveReorder}
              loading={reordering}
              variant="outline"
              icon={<Save className="h-4 w-4" />}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
            >
              Save Order
            </Button>
          )}
          <Button
            onClick={() => openCreate()}
            icon={<Plus className="h-4 w-4" />}
          >
            New Category
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderTree className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400">
              No categories yet
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => openCreate()}
              icon={<Plus className="h-4 w-4" />}
            >
              Create your first category
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 p-2 dark:divide-gray-700/50">
            {tree.map((cat) => renderNode(cat, 0))}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? "Edit Category"
            : !editingId &&
                form.name.includes(",") &&
                form.name.split(",").filter((n) => n.trim()).length >= 2
              ? `Create ${form.name.split(",").filter((n) => n.trim()).length} Categories`
              : "New Category"
        }
        size="lg"
      >
        <div className="space-y-4">
          {/* Row 1: Name + Parent */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={
                  editingId
                    ? "Category name"
                    : "Category name, or multiple, like this"
                }
              />
              {!editingId && (
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  💡 Tip: Separate names with commas to create multiple
                  categories at once.
                </p>
              )}
              {/* Bulk preview */}
              {!editingId && form.name.includes(",") && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {form.name
                    .split(",")
                    .map((n) => n.trim())
                    .filter(Boolean)
                    .map((n, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20 dark:text-primary"
                      >
                        {n}
                      </span>
                    ))}
                </div>
              )}
            </div>
            <Select
              label="Parent Category"
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">None (root level)</option>
              {getParentOptions().map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"─".repeat(opt.depth)} {opt.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Row 2: Icon + Image + Sort Order + Featured */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Input
              label="Icon (emoji or class)"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="e.g. 📁"
            />
            <Input
              label="Image URL"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="https://..."
            />
            <Input
              label="Sort Order"
              type="number"
              value={String(form.sortOrder)}
              onChange={(e) =>
                setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
              }
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="rounded"
                />
                Featured
              </label>
            </div>
          </div>

          {/* Row 3: Description (full width, compact) */}
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional description..."
            rows={2}
          />

          {/* Row 4: Color picker */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              <Palette className="mr-1 inline h-4 w-4" /> Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    form.color === c
                      ? "border-gray-900 dark:border-white scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.color || "#3B82F6"}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                title="Custom color"
              />
              {form.color && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, color: "" })}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingId
                ? "Update"
                : !editingId &&
                    form.name.includes(",") &&
                    form.name.split(",").filter((n) => n.trim()).length >= 2
                  ? `Create ${form.name.split(",").filter((n) => n.trim()).length} Categories`
                  : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Bulk Confirm Dialog ─── */}
      <ConfirmDialog
        open={!!bulkConfirm}
        title={`Bulk ${bulkConfirm?.label || "action"}`}
        message={`Are you sure you want to ${bulkConfirm?.label} ${selected.size} category${selected.size === 1 ? "" : "ies"}?${bulkConfirm?.action === "delete" ? " This cannot be undone." : ""}`}
        confirmText={bulkConfirm?.label === "delete" ? "Delete" : "Confirm"}
        variant={bulkConfirm?.action === "delete" ? "danger" : "primary"}
        onConfirm={executeBulkAction}
        onClose={() => setBulkConfirm(null)}
      />

      {/* ─── Delete Confirmation ─── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Category"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete{" "}
          <strong className="text-gray-900 dark:text-white">
            {deleteCat?.name}
          </strong>
          ? Any child categories will be moved to the parent level.
        </p>
        {(deleteCat?.postCount ?? 0) > 0 && (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            ⚠ This category has {deleteCat?.postCount} assigned posts. They will
            be uncategorized.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
