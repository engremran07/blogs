"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import type {
  MediaItem,
  UpdateMediaInput,
  MediaFilter,
  MediaSort,
  PaginatedResult,
  MediaFolder,
  MediaSeoAuditResult,
} from "@/features/media/types";

// Dynamic import to avoid SSR issues with the media manager component
const MediaManager = dynamic(
  () => import("@/features/media/ui/MediaManager").then((mod) => mod.default),
  { ssr: false, loading: () => <MediaManagerSkeleton /> },
);

function MediaManagerSkeleton() {
  return (
    <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading Media Manager…
        </p>
      </div>
    </div>
  );
}

export default function AdminMediaPage() {
  /* ── API wrappers ────────────────────────────────────────────────── */

  const handleUpload = useCallback(async (file: File): Promise<MediaItem> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/media", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();

    if (!json.success) throw new Error(json.error || "Upload failed");
    return json.data;
  }, []);

  const handleUploadFromUrl = useCallback(
    async (
      url: string,
      meta?: Partial<UpdateMediaInput>,
    ): Promise<MediaItem> => {
      const res = await fetch("/api/media/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, ...meta }),
      });
      if (!res.ok) throw new Error("Upload from URL failed");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Upload from URL failed");
      return json.data;
    },
    [],
  );

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Delete failed");
  }, []);

  const handleBulkDelete = useCallback(async (ids: string[]): Promise<void> => {
    const res = await fetch("/api/media/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", ids }),
    });
    if (!res.ok) throw new Error("Bulk delete failed");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Bulk delete failed");
  }, []);

  const handleBulkMove = useCallback(
    async (ids: string[], folder: string): Promise<void> => {
      const res = await fetch("/api/media/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", ids, targetFolder: folder }),
      });
      if (!res.ok) throw new Error("Bulk move failed");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Bulk move failed");
    },
    [],
  );

  const handleUpdate = useCallback(
    async (id: string, data: UpdateMediaInput): Promise<MediaItem> => {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Update failed");
      return json.data;
    },
    [],
  );

  const handleList = useCallback(
    async (
      filter?: MediaFilter,
      sort?: MediaSort,
      page?: number,
      pageSize?: number,
    ): Promise<PaginatedResult<MediaItem>> => {
      const params = new URLSearchParams();
      if (page) params.set("page", String(page));
      if (pageSize) params.set("pageSize", String(pageSize));
      if (filter?.search) params.set("search", filter.search);
      if (filter?.folder) params.set("folder", filter.folder);
      if (filter?.mediaType) params.set("mediaType", filter.mediaType);
      if (sort?.field) params.set("sortField", sort.field);
      if (sort?.direction) params.set("sortDir", sort.direction);

      const res = await fetch(`/api/media?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to list media");
      const json = await res.json();

      if (!json.success) throw new Error(json.error || "Failed to list media");
      return json.data;
    },
    [],
  );

  const handleListFolders = useCallback(async (): Promise<MediaFolder[]> => {
    const res = await fetch("/api/media/folders");
    if (!res.ok) throw new Error("Failed to list folders");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to list folders");
    return json.data;
  }, []);

  const handleCreateFolder = useCallback(
    async (name: string): Promise<MediaFolder> => {
      const res = await fetch("/api/media/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to create folder");
      return json.data;
    },
    [],
  );

  const handleRenameFolder = useCallback(
    async (id: string, name: string): Promise<MediaFolder> => {
      const res = await fetch(`/api/media/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename folder");
      const json = await res.json();
      if (!json.success)
        throw new Error(json.error || "Failed to rename folder");
      return json.data;
    },
    [],
  );

  const handleDeleteFolder = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/media/folders/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete folder");
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to delete folder");
  }, []);

  const handleAuditSeo = useCallback(
    async (item: MediaItem): Promise<MediaSeoAuditResult> => {
      // Client-side SEO audit — checks that don't need the server
      const suggestions: string[] = [];
      const hasAltText = !!item.altText && item.altText.trim().length > 0;
      if (!hasAltText)
        suggestions.push("Add descriptive alt text for accessibility and SEO");
      const isOptimized = item.isOptimized;
      if (!isOptimized && item.mimeType.startsWith("image/"))
        suggestions.push("Generate optimised variants for faster loading");
      const hasWebPVariant =
        !!item.variants &&
        Object.keys(item.variants as object).some((k) => k.includes("webp"));
      const hasOgVariant =
        !!item.variants &&
        (Object.keys(item.variants as object).includes("og") ||
          Object.keys(item.variants as object).includes("og_webp"));

      return {
        hasAltText,
        altTextLength: item.altText?.length ?? 0,
        isOptimized,
        hasWebPVariant,
        hasAvifVariant:
          !!item.variants &&
          Object.keys(item.variants as object).some((k) => k.includes("avif")),
        hasOgVariant,
        ogDimensionsCorrect: false,
        fileSizeWarning: item.size > 200 * 1024,
        formatWarning:
          item.mimeType.startsWith("image/") &&
          !["image/webp", "image/avif"].includes(item.mimeType),
        suggestions,
      };
    },
    [],
  );

  /* ── Render ──────────────────────────────────────────────────────── */

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Media Library
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload, organise, and manage your media files.
        </p>
      </div>

      <div className="h-[calc(100vh-14rem)]">
        <MediaManager
          onUpload={handleUpload}
          onUploadFromUrl={handleUploadFromUrl}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkMove={handleBulkMove}
          onUpdate={handleUpdate}
          onList={handleList}
          onListFolders={handleListFolders}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onAuditSeo={handleAuditSeo}
          mode="manager"
          adminSettings={{
            enableSeoAudit: true,
            enableDragDrop: true,
            enablePasteUpload: true,
            enableUrlUpload: true,
            enableBulkOperations: true,
            enableFolders: true,
            enableSearch: true,
            enableFilters: true,
          }}
        />
      </div>
    </div>
  );
}
