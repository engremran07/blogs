"use client";

// media-manager/MediaManager.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Full‑featured media manager / picker component.
//
// - Grid & list views (Windows Explorer‑style)
// - Drag‑and‑drop, paste, and URL upload
// - Folder sidebar with tree navigation
// - Search, filters, sort
// - Bulk operations (delete, move, tag)
// - Detail sidebar with SEO audit
// - Edit modal (alt text, title, description, tags)
// - Responsive, accessible, dark‑mode ready
//
// Dependencies: react, @headlessui/react, lucide-react
// Styles:       ./media-manager.css (CSS custom properties)
// ─────────────────────────────────────────────────────────────────────────────

import {
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  Dialog,
  Transition,
  TransitionChild,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { Fragment } from "react";
import {
  Upload,
  Search,
  Grid3X3,
  List,
  FolderPlus,
  Trash2,
  Pencil,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  Image as ImageIcon,
  Film,
  Music,
  FileText,
  File,
  Folder,
  FolderOpen,
  UploadCloud,
  Link2,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import type {
  MediaManagerProps,
  MediaManagerState,
  MediaManagerAction,
  MediaItem,
  MediaFolder,
  MediaFilter,
  MediaSort,
  UploadProgress,
  UploadQueueState,
  ResolvedMediaAdminSettings,
  SortField,
  MediaSeoAuditResult,
  UpdateMediaInput,
} from "../types";
import {
  formatFileSize,
  getMimeCategory,
  isImageMime,
  getMimeLabel,
  MEDIA_LIMITS,
  FRONTEND_DEFAULTS,
} from "../server/constants";

import "./media-manager.css";

/* ====================================================================== *
 *  Default settings                                                      *
 * ====================================================================== */

const DEFAULT_ADMIN_SETTINGS: ResolvedMediaAdminSettings = {
  maxUploadSize: MEDIA_LIMITS.MAX_FILE_SIZE,
  allowedMimeTypes: [],
  enableOptimization: true,
  enableDragDrop: true,
  enablePasteUpload: true,
  enableUrlUpload: true,
  enableBulkOperations: true,
  enableFolders: true,
  enableSearch: true,
  enableFilters: true,
  enableSeoAudit: true,
  defaultView: FRONTEND_DEFAULTS.defaultView,
  gridColumns: FRONTEND_DEFAULTS.gridColumns,
  pageSize: FRONTEND_DEFAULTS.pageSize,
};

/* ====================================================================== *
 *  Reducer                                                               *
 * ====================================================================== */

const INITIAL_UPLOAD_QUEUE: UploadQueueState = {
  items: [],
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  isUploading: false,
};

function createInitialState(
  settings: ResolvedMediaAdminSettings,
): MediaManagerState {
  return {
    viewMode: settings.defaultView,
    currentFolder: null,
    selectedIds: new Set<string>(),
    items: [],
    folders: [],
    totalItems: 0,
    page: 1,
    pageSize: settings.pageSize,
    search: "",
    filter: {},
    sort: { field: "date", direction: "desc" },
    isLoading: false,
    isUploading: false,
    uploadQueue: INITIAL_UPLOAD_QUEUE,
    detailItem: null,
    editItem: null,
    showUploadModal: false,
    showDeleteConfirm: false,
    deleteTargetIds: [],
    error: null,
    sidebarOpen: true,
  };
}

function mediaReducer(
  state: MediaManagerState,
  action: MediaManagerAction,
): MediaManagerState {
  switch (action.type) {
    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.payload };

    case "SET_FOLDER":
      return {
        ...state,
        currentFolder: action.payload,
        page: 1,
        selectedIds: new Set(),
        detailItem: null,
      };

    case "SET_SEARCH":
      return { ...state, search: action.payload, page: 1 };

    case "SET_FILTER":
      return { ...state, filter: action.payload, page: 1 };

    case "SET_SORT":
      return { ...state, sort: action.payload, page: 1 };

    case "SET_PAGE":
      return { ...state, page: action.payload };

    case "SELECT_ITEM":
      return {
        ...state,
        selectedIds: new Set(state.selectedIds).add(action.payload),
      };

    case "DESELECT_ITEM": {
      const next = new Set(state.selectedIds);
      next.delete(action.payload);
      return { ...state, selectedIds: next };
    }

    case "SELECT_ALL":
      return {
        ...state,
        selectedIds: new Set(state.items.map((i) => i.id)),
      };

    case "DESELECT_ALL":
      return { ...state, selectedIds: new Set() };

    case "TOGGLE_SELECT": {
      const next = new Set(state.selectedIds);
      if (next.has(action.payload)) next.delete(action.payload);
      else next.add(action.payload);
      return { ...state, selectedIds: next };
    }

    case "SET_ITEMS":
      return {
        ...state,
        items: action.payload.items,
        totalItems: action.payload.total,
        isLoading: false,
      };

    case "SET_FOLDERS":
      return { ...state, folders: action.payload };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_DETAIL":
      return { ...state, detailItem: action.payload };

    case "SET_EDIT":
      return { ...state, editItem: action.payload };

    case "SET_UPLOAD_MODAL":
      return { ...state, showUploadModal: action.payload };

    case "SET_DELETE_CONFIRM":
      return {
        ...state,
        showDeleteConfirm: action.payload.show,
        deleteTargetIds: action.payload.ids,
      };

    case "UPDATE_ITEM":
      return {
        ...state,
        items: state.items.map((i) =>
          i.id === action.payload.id ? action.payload : i,
        ),
        detailItem:
          state.detailItem?.id === action.payload.id
            ? action.payload
            : state.detailItem,
      };

    case "REMOVE_ITEMS": {
      const removedSet = new Set(action.payload);
      const nextSelected = new Set(state.selectedIds);
      action.payload.forEach((id) => nextSelected.delete(id));
      return {
        ...state,
        items: state.items.filter((i) => !removedSet.has(i.id)),
        totalItems: state.totalItems - action.payload.length,
        selectedIds: nextSelected,
        detailItem:
          state.detailItem && removedSet.has(state.detailItem.id)
            ? null
            : state.detailItem,
      };
    }

    case "ADD_ITEM":
      return {
        ...state,
        items: [action.payload, ...state.items],
        totalItems: state.totalItems + 1,
      };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_SIDEBAR":
      return { ...state, sidebarOpen: action.payload };

    case "UPLOAD_START":
      return { ...state, isUploading: true };

    case "UPLOAD_PROGRESS":
      return {
        ...state,
        uploadQueue: {
          ...state.uploadQueue,
          isUploading: true,
          items: upsertProgress(state.uploadQueue.items, action.payload),
        },
      };

    case "UPLOAD_COMPLETE":
      return {
        ...state,
        uploadQueue: {
          ...state.uploadQueue,
          completedFiles: state.uploadQueue.completedFiles + 1,
          items: upsertProgress(state.uploadQueue.items, action.payload),
        },
      };

    case "UPLOAD_FAILED":
      return {
        ...state,
        uploadQueue: {
          ...state.uploadQueue,
          failedFiles: state.uploadQueue.failedFiles + 1,
          items: upsertProgress(state.uploadQueue.items, action.payload),
        },
      };

    case "UPLOAD_RESET":
      return {
        ...state,
        isUploading: false,
        uploadQueue: INITIAL_UPLOAD_QUEUE,
      };

    default:
      return state;
  }
}

function upsertProgress(
  items: UploadProgress[],
  item: UploadProgress,
): UploadProgress[] {
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) {
    const next = [...items];
    next[idx] = item;
    return next;
  }
  return [...items, item];
}

/* ====================================================================== *
 *  Icon helper                                                           *
 * ====================================================================== */

function MediaTypeIcon({
  mimeType,
  size = 24,
  className,
}: {
  mimeType: string;
  size?: number;
  className?: string;
}) {
  const type = getMimeCategory(mimeType);
  switch (type) {
    case "IMAGE":
      return <ImageIcon size={size} className={className} />;
    case "VIDEO":
      return <Film size={size} className={className} />;
    case "AUDIO":
      return <Music size={size} className={className} />;
    case "DOCUMENT":
      return <FileText size={size} className={className} />;
    default:
      return <File size={size} className={className} />;
  }
}

/* ====================================================================== *
 *  Internal sub‑components                                               *
 * ====================================================================== */

/** ── Toolbar ───────────────────────────────────────────────────────── */
function Toolbar({
  state,
  dispatch,
  settings,
  onUploadClick,
  onToggleSidebar,
}: {
  state: MediaManagerState;
  dispatch: React.Dispatch<MediaManagerAction>;
  settings: ResolvedMediaAdminSettings;
  onUploadClick: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <div
      className="mm-toolbar"
      role="toolbar"
      aria-label="Media manager toolbar"
    >
      {settings.enableFolders && (
        <button
          className="mm-btn mm-btn--ghost mm-btn--icon"
          onClick={onToggleSidebar}
          aria-label={state.sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          title={state.sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {state.sidebarOpen ? (
            <PanelLeftClose size={18} />
          ) : (
            <PanelLeftOpen size={18} />
          )}
        </button>
      )}

      <button className="mm-btn mm-btn--primary" onClick={onUploadClick}>
        <Upload size={16} />
        Upload
      </button>

      {settings.enableSearch && (
        <div className="mm-search">
          <Search
            size={16}
            style={{ color: "var(--mm-text-muted)", flexShrink: 0 }}
          />
          <input
            className="mm-search__input"
            type="text"
            placeholder="Search media…"
            value={state.search}
            onChange={(e) =>
              dispatch({ type: "SET_SEARCH", payload: e.target.value })
            }
            aria-label="Search media"
          />
          {state.search && (
            <button
              className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
              style={{ padding: "2px" }}
              onClick={() => dispatch({ type: "SET_SEARCH", payload: "" })}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <span className="mm-toolbar__spacer" />

      {/* Filter by type */}
      {settings.enableFilters && (
        <TypeFilter
          currentType={state.filter.mediaType ?? null}
          onChange={(mediaType) =>
            dispatch({
              type: "SET_FILTER",
              payload: { ...state.filter, mediaType: mediaType ?? undefined },
            })
          }
        />
      )}

      {/* Sort */}
      <SortControl
        sort={state.sort}
        onSort={(sort) => dispatch({ type: "SET_SORT", payload: sort })}
      />

      <span className="mm-toolbar__separator" />

      {/* View mode */}
      <div
        className="mm-toolbar__group"
        role="radiogroup"
        aria-label="View mode"
      >
        <button
          className={`mm-btn mm-btn--icon ${
            state.viewMode === "grid" ? "mm-btn--active" : "mm-btn--ghost"
          }`}
          onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "grid" })}
          aria-label="Grid view"
          aria-pressed={state.viewMode === "grid"}
        >
          <Grid3X3 size={18} />
        </button>
        <button
          className={`mm-btn mm-btn--icon ${
            state.viewMode === "list" ? "mm-btn--active" : "mm-btn--ghost"
          }`}
          onClick={() => dispatch({ type: "SET_VIEW_MODE", payload: "list" })}
          aria-label="List view"
          aria-pressed={state.viewMode === "list"}
        >
          <List size={18} />
        </button>
      </div>
    </div>
  );
}

/** ── Type filter ──────────────────────────────────────────────────── */
function TypeFilter({
  currentType,
  onChange,
}: {
  currentType: import("../types").MediaType | null;
  onChange: (type: import("../types").MediaType | null) => void;
}) {
  type TypeOption = {
    value: import("../types").MediaType | null;
    label: string;
    icon: ReactNode;
  };
  const types: TypeOption[] = [
    { value: null, label: "All types", icon: <SlidersHorizontal size={14} /> },
    { value: "IMAGE", label: "Images", icon: <ImageIcon size={14} /> },
    { value: "VIDEO", label: "Videos", icon: <Film size={14} /> },
    { value: "AUDIO", label: "Audio", icon: <Music size={14} /> },
    { value: "DOCUMENT", label: "Documents", icon: <FileText size={14} /> },
  ];

  const active = types.find((t) => t.value === currentType) ?? types[0];

  return (
    <div style={{ position: "relative" }}>
      <button
        className={`mm-btn mm-btn--sm ${currentType ? "mm-btn--active" : ""}`}
        onClick={() => {
          /* cycle through types on click */
          const idx = types.findIndex((t) => t.value === currentType);
          const next = types[(idx + 1) % types.length];
          onChange(next.value);
        }}
        aria-label={`Filter: ${active.label}`}
        title={`Filter: ${active.label}`}
      >
        {active.icon}
        <span style={{ marginLeft: 4 }}>{active.label}</span>
      </button>
    </div>
  );
}

/** ── Sort control ─────────────────────────────────────────────────── */
function SortControl({
  sort,
  onSort,
}: {
  sort: MediaSort;
  onSort: (s: MediaSort) => void;
}) {
  const fields: { value: SortField; label: string }[] = [
    { value: "date", label: "Date" },
    { value: "name", label: "Name" },
    { value: "size", label: "Size" },
    { value: "type", label: "Type" },
  ];

  const handleClick = () => {
    const idx = fields.findIndex((f) => f.value === sort.field);
    const nextIdx = (idx + 1) % fields.length;
    onSort({ field: fields[nextIdx].value, direction: sort.direction });
  };

  const handleDirectionToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSort({
      field: sort.field,
      direction: sort.direction === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className="mm-toolbar__group">
      <button
        className="mm-btn mm-btn--sm"
        onClick={handleClick}
        title={`Sort by ${sort.field}`}
        aria-label={`Sort by ${sort.field}`}
      >
        <ArrowUpDown size={14} />
        <span>
          {fields.find((f) => f.value === sort.field)?.label ?? "Date"}
        </span>
      </button>
      <button
        className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
        onClick={handleDirectionToggle}
        aria-label={sort.direction === "asc" ? "Ascending" : "Descending"}
        title={sort.direction === "asc" ? "Ascending" : "Descending"}
      >
        {sort.direction === "asc" ? (
          <ArrowUp size={14} />
        ) : (
          <ArrowDown size={14} />
        )}
      </button>
    </div>
  );
}

/** ── Bulk actions bar ─────────────────────────────────────────────── */
function BulkActionsBar({
  count,
  onSelectAll,
  onDeselectAll,
  onDelete,
  onDownload,
  totalItems,
}: {
  count: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onDelete: () => void;
  onDownload?: () => void;
  totalItems: number;
}) {
  return (
    <div className="mm-bulk-bar" role="toolbar" aria-label="Bulk actions">
      <span className="mm-bulk-bar__count">{count} selected</span>
      {count < totalItems && (
        <button className="mm-btn mm-btn--sm" onClick={onSelectAll}>
          <Check size={14} />
          Select all
        </button>
      )}
      <button className="mm-btn mm-btn--sm" onClick={onDeselectAll}>
        <X size={14} />
        Clear
      </button>
      <span className="mm-toolbar__spacer" />
      {onDownload && (
        <button className="mm-btn mm-btn--sm" onClick={onDownload}>
          <Download size={14} />
          Download
        </button>
      )}
      <button className="mm-btn mm-btn--danger mm-btn--sm" onClick={onDelete}>
        <Trash2 size={14} />
        Delete
      </button>
    </div>
  );
}

/** ── Folder sidebar ───────────────────────────────────────────────── */
function FolderSidebar({
  folders,
  currentFolder,
  onSelect,
  onCreateFolder,
}: {
  folders: MediaFolder[];
  currentFolder: string | null;
  onSelect: (folderId: string | null) => void;
  onCreateFolder?: () => void;
}) {
  return (
    <nav aria-label="Folder navigation">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.625rem 0.75rem",
          borderBottom: "1px solid var(--mm-border)",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--mm-text-muted)",
          }}
        >
          Folders
        </span>
        {onCreateFolder && (
          <button
            className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
            onClick={onCreateFolder}
            aria-label="Create folder"
            title="Create folder"
          >
            <FolderPlus size={14} />
          </button>
        )}
      </div>
      <ul className="mm-folder-list" role="listbox" aria-label="Folders">
        {/* All files */}
        <li
          className={`mm-folder-item ${currentFolder === null ? "mm-folder-item--active" : ""}`}
          role="option"
          aria-selected={currentFolder === null}
          onClick={() => onSelect(null)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(null);
            }
          }}
        >
          <FolderOpen size={16} />
          <span>All files</span>
        </li>
        {folders.map((folder) => (
          <li
            key={folder.id}
            className={`mm-folder-item ${
              currentFolder === folder.id ? "mm-folder-item--active" : ""
            }`}
            role="option"
            aria-selected={currentFolder === folder.id}
            onClick={() => onSelect(folder.id)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(folder.id);
              }
            }}
          >
            <Folder size={16} />
            <span className="mm-truncate">{folder.name}</span>
            {folder.itemCount != null && (
              <span className="mm-folder-item__count">{folder.itemCount}</span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** ── Grid view ────────────────────────────────────────────────────── */
function MediaGrid({
  items,
  selectedIds,
  onToggleSelect,
  onItemClick,
}: {
  items: MediaItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string, e: React.SyntheticEvent) => void;
  onItemClick: (item: MediaItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="mm-empty">
        <ImageIcon className="mm-empty__icon" size={48} />
        <p className="mm-empty__title">No media found</p>
        <p className="mm-empty__text">
          Upload files or try adjusting your search and filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mm-grid" role="grid" aria-label="Media items">
      {items.map((item) => {
        const isSelected = selectedIds.has(item.id);
        const isImage = isImageMime(item.mimeType);
        return (
          <div
            key={item.id}
            className={`mm-grid-item ${isSelected ? "mm-grid-item--selected" : ""}`}
            role="gridcell"
            onClick={() => onItemClick(item)}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") onItemClick(item);
              if (e.key === " ") {
                e.preventDefault();
                onToggleSelect(item.id, e);
              }
            }}
            aria-selected={isSelected}
            aria-label={item.originalName}
          >
            {/* Selection checkbox */}
            <div
              className="mm-grid-item__check"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(item.id, e);
              }}
            >
              <span
                className={`mm-checkbox ${isSelected ? "mm-checkbox--checked" : ""}`}
                role="checkbox"
                aria-checked={isSelected}
                tabIndex={-1}
              >
                {isSelected && <Check size={12} />}
              </span>
            </div>

            {/* Type badge */}
            <span className="mm-grid-item__badge">
              {getMimeCategory(item.mimeType).toLowerCase()}
            </span>

            {/* Thumbnail or icon */}
            {isImage ? (
              <Image
                src={item.variants?.thumb?.url ?? item.url}
                alt={item.altText || item.originalName}
                width={160}
                height={160}
                className="mm-grid-item__thumb"
                loading="lazy"
                draggable={false}
                unoptimized
              />
            ) : (
              <div className="mm-grid-item__placeholder">
                <MediaTypeIcon mimeType={item.mimeType} size={32} />
              </div>
            )}

            {/* Info */}
            <div className="mm-grid-item__info">
              <div className="mm-grid-item__name" title={item.originalName}>
                {item.originalName}
              </div>
              <div className="mm-grid-item__meta">
                {formatFileSize(item.size)}
                {item.width && item.height && ` · ${item.width}×${item.height}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** ── List view ────────────────────────────────────────────────────── */
function MediaList({
  items,
  selectedIds,
  sort,
  onToggleSelect,
  onSelectAll,
  onItemClick,
  onSort,
}: {
  items: MediaItem[];
  selectedIds: Set<string>;
  sort: MediaSort;
  onToggleSelect: (id: string, e: React.SyntheticEvent) => void;
  onSelectAll: () => void;
  onItemClick: (item: MediaItem) => void;
  onSort: (s: MediaSort) => void;
}) {
  const allSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  const sortHeader = (field: SortField, label: string) => {
    const active = sort.field === field;
    return (
      <th
        onClick={() =>
          onSort({
            field,
            direction: active && sort.direction === "asc" ? "desc" : "asc",
          })
        }
        aria-sort={
          active
            ? sort.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <span
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          {label}
          {active &&
            (sort.direction === "asc" ? (
              <ArrowUp size={12} />
            ) : (
              <ArrowDown size={12} />
            ))}
        </span>
      </th>
    );
  };

  if (items.length === 0) {
    return (
      <div className="mm-empty">
        <ImageIcon className="mm-empty__icon" size={48} />
        <p className="mm-empty__title">No media found</p>
        <p className="mm-empty__text">
          Upload files or try adjusting your search and filters.
        </p>
      </div>
    );
  }

  return (
    <table className="mm-list" role="grid" aria-label="Media items">
      <thead>
        <tr>
          <th style={{ width: 40 }}>
            <span
              className={`mm-checkbox ${allSelected ? "mm-checkbox--checked" : ""}`}
              role="checkbox"
              aria-checked={allSelected}
              tabIndex={0}
              onClick={onSelectAll}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectAll();
                }
              }}
            >
              {allSelected && <Check size={12} />}
            </span>
          </th>
          <th style={{ width: 56 }}>Preview</th>
          {sortHeader("name", "Name")}
          {sortHeader("type", "Type")}
          {sortHeader("size", "Size")}
          {sortHeader("date", "Date")}
          <th style={{ width: 80 }}>Alt text</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          const isImage = isImageMime(item.mimeType);
          return (
            <tr
              key={item.id}
              className={isSelected ? "mm-list-row--selected" : ""}
              onClick={() => onItemClick(item)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") onItemClick(item);
              }}
              role="row"
              aria-selected={isSelected}
            >
              <td onClick={(e) => e.stopPropagation()}>
                <span
                  className={`mm-checkbox ${isSelected ? "mm-checkbox--checked" : ""}`}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={-1}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelect(item.id, e);
                  }}
                >
                  {isSelected && <Check size={12} />}
                </span>
              </td>
              <td>
                {isImage ? (
                  <Image
                    src={item.variants?.thumb?.url ?? item.url}
                    alt={item.altText || item.originalName}
                    width={40}
                    height={40}
                    className="mm-list__thumb"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <span className="mm-list__thumb-placeholder">
                    <MediaTypeIcon mimeType={item.mimeType} size={20} />
                  </span>
                )}
              </td>
              <td>
                <span
                  className="mm-truncate"
                  style={{ maxWidth: 240, display: "inline-block" }}
                >
                  {item.originalName}
                </span>
              </td>
              <td>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--mm-text-secondary)",
                  }}
                >
                  {getMimeLabel(item.mimeType)}
                </span>
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {formatFileSize(item.size)}
              </td>
              <td style={{ whiteSpace: "nowrap", fontSize: "0.75rem" }}>
                {new Date(item.createdAt).toLocaleDateString()}
              </td>
              <td>
                {item.altText ? (
                  <CheckCircle
                    size={14}
                    style={{ color: "var(--mm-success)" }}
                  />
                ) : (
                  <AlertTriangle
                    size={14}
                    style={{ color: "var(--mm-warning)" }}
                  />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** ── Detail sidebar ───────────────────────────────────────────────── */
function DetailPanel({
  item,
  onClose,
  onEdit,
  onDelete,
  onCopyUrl,
  onDownload,
  seoAudit,
}: {
  item: MediaItem;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyUrl: () => void;
  onDownload?: () => void;
  seoAudit: MediaSeoAuditResult | null;
}) {
  const isImage = isImageMime(item.mimeType);

  // Compute a simple score from the audit
  const computeScore = (audit: MediaSeoAuditResult): number => {
    let score = 0;
    const checks = [
      audit.hasAltText,
      audit.isOptimized,
      audit.hasWebPVariant,
      audit.hasAvifVariant,
      audit.hasOgVariant,
      audit.ogDimensionsCorrect,
      !audit.fileSizeWarning,
      !audit.formatWarning,
    ];
    const weight = 100 / checks.length;
    for (const ok of checks) if (ok) score += weight;
    return Math.round(score);
  };

  return (
    <div className="mm-detail" role="complementary" aria-label="Media details">
      {/* Close */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "0.5rem",
        }}
      >
        <button
          className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
          onClick={onClose}
          aria-label="Close details"
        >
          <X size={16} />
        </button>
      </div>

      {/* Preview */}
      {isImage ? (
        <Image
          src={item.variants?.medium?.url ?? item.url}
          alt={item.altText || item.originalName}
          width={480}
          height={320}
          className="mm-detail__preview"
          draggable={false}
          unoptimized
        />
      ) : (
        <div
          className="mm-detail__preview"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MediaTypeIcon mimeType={item.mimeType} size={48} />
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <button className="mm-btn mm-btn--sm" onClick={onEdit}>
          <Pencil size={14} />
          Edit
        </button>
        <button className="mm-btn mm-btn--sm" onClick={onCopyUrl}>
          <Copy size={14} />
          Copy URL
        </button>
        {onDownload && (
          <button className="mm-btn mm-btn--sm" onClick={onDownload}>
            <Download size={14} />
          </button>
        )}
        <button className="mm-btn mm-btn--danger mm-btn--sm" onClick={onDelete}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* File info */}
      <div className="mm-detail__section">
        <span className="mm-detail__label">Filename</span>
        <span className="mm-detail__value">{item.originalName}</span>
      </div>

      <div className="mm-detail__section">
        <span className="mm-detail__label">Type</span>
        <span className="mm-detail__value">{getMimeLabel(item.mimeType)}</span>
      </div>

      <div className="mm-detail__section">
        <span className="mm-detail__label">Size</span>
        <span className="mm-detail__value">{formatFileSize(item.size)}</span>
      </div>

      {item.width != null && item.height != null && (
        <div className="mm-detail__section">
          <span className="mm-detail__label">Dimensions</span>
          <span className="mm-detail__value">
            {item.width} × {item.height}px
          </span>
        </div>
      )}

      <div className="mm-detail__section">
        <span className="mm-detail__label">Uploaded</span>
        <span className="mm-detail__value">
          {new Date(item.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Alt text */}
      <div className="mm-detail__section">
        <span className="mm-detail__label">Alt text</span>
        <span className="mm-detail__value">
          {item.altText || (
            <span
              style={{
                color: "var(--mm-warning)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <AlertTriangle size={12} /> Missing — click Edit to add
            </span>
          )}
        </span>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="mm-detail__section">
          <span className="mm-detail__label">Tags</span>
          <div className="mm-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="mm-tag">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Variants */}
      {item.variants && isImage && (
        <div className="mm-detail__section">
          <span className="mm-detail__label">Variants</span>
          <div className="mm-variants">
            {(["thumb", "small", "medium", "large", "og"] as const).map(
              (preset) => (
                <span
                  key={preset}
                  className={`mm-variant-badge ${
                    item.variants?.[preset]
                      ? "mm-variant-badge--available"
                      : "mm-variant-badge--missing"
                  }`}
                >
                  {preset}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      {/* SEO audit */}
      {seoAudit &&
        (() => {
          const score = computeScore(seoAudit);
          return (
            <div className="mm-detail__section">
              <span className="mm-detail__label">SEO Score</span>
              <span
                className={`mm-seo-score ${
                  score >= 80
                    ? "mm-seo-score--good"
                    : score >= 50
                      ? "mm-seo-score--warning"
                      : "mm-seo-score--poor"
                }`}
              >
                {score >= 80 ? (
                  <CheckCircle size={12} />
                ) : score >= 50 ? (
                  <AlertTriangle size={12} />
                ) : (
                  <XCircle size={12} />
                )}
                {score}/100
              </span>
              {seoAudit.suggestions.length > 0 && (
                <ul
                  style={{
                    marginTop: "0.5rem",
                    paddingLeft: "1rem",
                    fontSize: "0.75rem",
                    color: "var(--mm-text-secondary)",
                  }}
                >
                  {seoAudit.suggestions.map(
                    (suggestion: string, idx: number) => (
                      <li key={idx}>{suggestion}</li>
                    ),
                  )}
                </ul>
              )}
            </div>
          );
        })()}

      {/* URL */}
      <div className="mm-detail__section" style={{ borderBottom: "none" }}>
        <span className="mm-detail__label">URL</span>
        <span
          className="mm-detail__value"
          style={{ fontFamily: "var(--mm-font-mono)", fontSize: "0.6875rem" }}
        >
          {item.url}
        </span>
      </div>
    </div>
  );
}

/** ── Upload progress bar ──────────────────────────────────────────── */
function UploadProgressBar({ queue }: { queue: UploadQueueState }) {
  if (!queue.isUploading && queue.items.length === 0) return null;

  const totalProgress =
    queue.items.length > 0
      ? queue.items.reduce((sum, i) => sum + i.progress, 0) / queue.items.length
      : 0;

  const activeCount = queue.items.filter(
    (i) => i.status === "uploading" || i.status === "processing",
  ).length;

  return (
    <div
      className="mm-upload-progress"
      role="status"
      aria-label="Upload progress"
    >
      <div className="mm-upload-progress__bar">
        <div
          className="mm-upload-progress__fill"
          style={{ width: `${totalProgress}%` }}
          aria-valuenow={totalProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      <div className="mm-upload-progress__text">
        <span>
          {queue.completedFiles}/{queue.totalFiles} completed
          {queue.failedFiles > 0 && ` · ${queue.failedFiles} failed`}
        </span>
        {activeCount > 0 && (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <Loader2
              size={12}
              className="mm-spinner"
              style={{ border: "none", animation: "none" }}
            />
            Uploading {activeCount} file{activeCount !== 1 ? "s" : ""}…
          </span>
        )}
      </div>
    </div>
  );
}

/** ── Pagination ───────────────────────────────────────────────────── */
function Pagination({
  page,
  totalItems,
  pageSize,
  onChange,
}: {
  page: number;
  totalItems: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="mm-pagination" role="navigation" aria-label="Pagination">
      <span className="mm-pagination__info">
        {from}–{to} of {totalItems}
      </span>
      <button
        className="mm-btn mm-btn--icon mm-btn--sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {generatePageNumbers(page, totalPages).map((p, idx) =>
        p === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            style={{ padding: "0 4px", color: "var(--mm-text-muted)" }}
          >
            …
          </span>
        ) : (
          <button
            key={p}
            className={`mm-btn mm-btn--sm ${
              p === page ? "mm-btn--active" : "mm-btn--ghost"
            }`}
            onClick={() => onChange(p as number)}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        ),
      )}
      <button
        className="mm-btn mm-btn--icon mm-btn--sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function generatePageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  for (
    let i = Math.max(2, current - 1);
    i <= Math.min(total - 1, current + 1);
    i++
  ) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

/** ── Edit modal ───────────────────────────────────────────────────── */
function EditModal({
  item,
  onSave,
  onClose,
}: {
  item: MediaItem;
  onSave: (id: string, data: UpdateMediaInput) => Promise<void>;
  onClose: () => void;
}) {
  const [altText, setAltText] = useState(item.altText ?? "");
  const [title, setTitle] = useState(item.title ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [saving, setSaving] = useState(false);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < MEDIA_LIMITS.MAX_TAGS) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(item.id, {
        altText: altText || null,
        title: title || null,
        description: description || null,
        tags,
      });
      onClose();
    } catch {
      /* error handled by parent */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog
        onClose={onClose}
        className="mm-root"
        style={{ position: "relative", zIndex: 200 }}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="mm-modal-overlay" aria-hidden="true" />
        </TransitionChild>

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TransitionChild
            as={Fragment}
            enter="transition-all duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="mm-modal" style={{ maxWidth: 560 }}>
              <div className="mm-modal__header">
                <DialogTitle className="mm-modal__title">
                  Edit media
                </DialogTitle>
                <button
                  className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div
                className="mm-modal__body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {/* Alt text */}
                <div>
                  <label className="mm-detail__label" htmlFor="mm-edit-alt">
                    Alt text
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        letterSpacing: "normal",
                        marginLeft: 4,
                      }}
                    >
                      (important for SEO & accessibility)
                    </span>
                  </label>
                  <textarea
                    id="mm-edit-alt"
                    className="mm-detail__textarea"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    maxLength={MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH}
                    placeholder="Describe this media for screen readers and search engines…"
                    rows={2}
                  />
                  <div
                    className={`mm-detail__char-count ${
                      altText.length > MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH * 0.9
                        ? altText.length >= MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH
                          ? "mm-detail__char-count--error"
                          : "mm-detail__char-count--warn"
                        : ""
                    }`}
                  >
                    {altText.length}/{MEDIA_LIMITS.MAX_ALT_TEXT_LENGTH}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="mm-detail__label" htmlFor="mm-edit-title">
                    Title
                  </label>
                  <input
                    id="mm-edit-title"
                    className="mm-detail__input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={MEDIA_LIMITS.MAX_TITLE_LENGTH}
                    placeholder="Optional title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mm-detail__label" htmlFor="mm-edit-desc">
                    Description
                  </label>
                  <textarea
                    id="mm-edit-desc"
                    className="mm-detail__textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={MEDIA_LIMITS.MAX_DESCRIPTION_LENGTH}
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="mm-detail__label">Tags</label>
                  <div className="mm-tags" style={{ marginBottom: "0.5rem" }}>
                    {tags.map((tag) => (
                      <span key={tag} className="mm-tag">
                        {tag}
                        <button
                          className="mm-tag__remove"
                          onClick={() => handleRemoveTag(tag)}
                          aria-label={`Remove tag ${tag}`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    <input
                      className="mm-detail__input"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag + Enter"
                      maxLength={MEDIA_LIMITS.MAX_TAG_LENGTH}
                    />
                    <button
                      className="mm-btn mm-btn--sm"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="mm-modal__footer">
                <button className="mm-btn" onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button
                  className="mm-btn mm-btn--primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: "mm-spin 0.6s linear infinite" }}
                      />
                      Saving…
                    </>
                  ) : (
                    "Save changes"
                  )}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

/** ── URL upload modal ─────────────────────────────────────────────── */
function UrlUploadModal({
  onUpload,
  onClose,
}: {
  onUpload: (url: string) => Promise<void>;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!url.trim()) return;
    setUploading(true);
    setError(null);
    try {
      await onUpload(url.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog
        onClose={onClose}
        className="mm-root"
        style={{ position: "relative", zIndex: 200 }}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="mm-modal-overlay" aria-hidden="true" />
        </TransitionChild>

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TransitionChild
            as={Fragment}
            enter="transition-all duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="mm-modal">
              <div className="mm-modal__header">
                <DialogTitle className="mm-modal__title">
                  Upload from URL
                </DialogTitle>
                <button
                  className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div
                className="mm-modal__body"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <label className="mm-detail__label" htmlFor="mm-url-input">
                  Paste a public file URL
                </label>
                <div className="mm-search" style={{ maxWidth: "none" }}>
                  <Link2
                    size={16}
                    style={{ color: "var(--mm-text-muted)", flexShrink: 0 }}
                  />
                  <input
                    id="mm-url-input"
                    className="mm-search__input"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpload();
                    }}
                    autoFocus
                  />
                </div>
                {error && (
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--mm-danger)",
                      margin: 0,
                    }}
                  >
                    {error}
                  </p>
                )}
              </div>
              <div className="mm-modal__footer">
                <button
                  className="mm-btn"
                  onClick={onClose}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  className="mm-btn mm-btn--primary"
                  onClick={handleUpload}
                  disabled={!url.trim() || uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={14}
                        style={{ animation: "mm-spin 0.6s linear infinite" }}
                      />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <UploadCloud size={14} />
                      Upload
                    </>
                  )}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

/** ── Confirm dialog ───────────────────────────────────────────────── */
function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        onClose={onCancel}
        className="mm-root"
        style={{ position: "relative", zIndex: 200 }}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="mm-modal-overlay" aria-hidden="true" />
        </TransitionChild>

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TransitionChild
            as={Fragment}
            enter="transition-all duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="mm-modal" style={{ maxWidth: 400 }}>
              <div className="mm-modal__header">
                <DialogTitle className="mm-modal__title">{title}</DialogTitle>
              </div>
              <div className="mm-modal__body">
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.875rem",
                    color: "var(--mm-text-secondary)",
                  }}
                >
                  {message}
                </p>
              </div>
              <div className="mm-modal__footer">
                <button className="mm-btn" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  className={`mm-btn ${danger ? "mm-btn--danger" : "mm-btn--primary"}`}
                  onClick={onConfirm}
                >
                  {confirmLabel}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

/** ── Create folder dialog ─────────────────────────────────────────── */
function CreateFolderDialog({
  show,
  onConfirm,
  onCancel,
}: {
  show: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      setName("");
    }
  };

  return (
    <Transition appear show={show} as={Fragment}>
      <Dialog
        onClose={onCancel}
        className="mm-root"
        style={{ position: "relative", zIndex: 200 }}
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="mm-modal-overlay" aria-hidden="true" />
        </TransitionChild>

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TransitionChild
            as={Fragment}
            enter="transition-all duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="mm-modal" style={{ maxWidth: 400 }}>
              <div className="mm-modal__header">
                <DialogTitle className="mm-modal__title">
                  Create folder
                </DialogTitle>
                <button
                  className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
                  onClick={onCancel}
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="mm-modal__body">
                <label className="mm-detail__label" htmlFor="mm-folder-name">
                  Folder name
                </label>
                <input
                  id="mm-folder-name"
                  className="mm-detail__input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirm();
                  }}
                  placeholder="New folder"
                  autoFocus
                  maxLength={100}
                />
              </div>
              <div className="mm-modal__footer">
                <button className="mm-btn" onClick={onCancel}>
                  Cancel
                </button>
                <button
                  className="mm-btn mm-btn--primary"
                  onClick={handleConfirm}
                  disabled={!name.trim()}
                >
                  <FolderPlus size={14} />
                  Create
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

/* ====================================================================== *
 *  Main component                                                        *
 * ====================================================================== */

/**
 * `<MediaManager />` — Full‑featured media browser / picker.
 *
 * Renders a Windows Explorer‑style file manager with drag‑and‑drop
 * upload, folder navigation, grid/list views, search & filtering,
 * bulk operations, detail panel with SEO audit, and responsive design.
 *
 * All data operations are delegated to the consumer‑supplied callbacks
 * (DI pattern), keeping this component stateless with respect to
 * server interactions.
 *
 * @example
 * ```tsx
 * <MediaManager
 *   onUpload={async (file) => mediaService.uploadFile(file)}
 *   onDelete={async (id) => mediaService.delete(id)}
 *   onUpdate={async (id, data) => mediaService.update(id, data)}
 *   onList={async (filter, sort, page, size) => mediaService.list(filter, sort, page, size)}
 * />
 * ```
 */
export function MediaManager(props: MediaManagerProps) {
  const {
    onUpload,
    onUploadFromUrl,
    onDelete,
    onBulkDelete,
    onUpdate,
    onList,
    onListFolders,
    onCreateFolder,
    onAuditSeo,
    onDownload,
    onSelect,
    mode = "manager",
    multiSelect = false,
    adminSettings,
    className,
    accept,
  } = props;

  const settings: ResolvedMediaAdminSettings = useMemo(
    () => ({ ...DEFAULT_ADMIN_SETTINGS, ...adminSettings }),
    [adminSettings],
  );

  const isPicker = mode === "picker";

  const [state, dispatch] = useReducer(
    mediaReducer,
    settings,
    createInitialState,
  );

  const [seoAudit, setSeoAudit] = useState<MediaSeoAuditResult | null>(null);
  const [showUrlUpload, setShowUrlUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounter = useRef(0);

  /* ── Data fetching ──────────────────────────────────────────────── */

  const fetchItems = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });
    try {
      const filter: MediaFilter = {
        ...state.filter,
        folder: state.currentFolder ?? undefined,
        search: state.search || undefined,
      };
      const result = await onList(
        filter,
        state.sort,
        state.page,
        state.pageSize,
      );
      dispatch({
        type: "SET_ITEMS",
        payload: { items: result.data, total: result.total },
      });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Failed to load media",
      });
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, [
    onList,
    state.filter,
    state.currentFolder,
    state.search,
    state.sort,
    state.page,
    state.pageSize,
  ]);

  const fetchFolders = useCallback(async () => {
    if (!onListFolders || !settings.enableFolders) return;
    try {
      const folders = await onListFolders();
      dispatch({ type: "SET_FOLDERS", payload: folders });
    } catch {
      /* silent */
    }
  }, [onListFolders, settings.enableFolders]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  /* ── SEO audit on detail item ───────────────────────────────────── */

  useEffect(() => {
    if (!state.detailItem || !onAuditSeo || !settings.enableSeoAudit) {
      setSeoAudit(null);
      return;
    }
    let cancelled = false;
    onAuditSeo(state.detailItem)
      .then((result) => {
        if (!cancelled) setSeoAudit(result);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [state.detailItem, onAuditSeo, settings.enableSeoAudit]);

  /* ── File upload handler ────────────────────────────────────────── */

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      dispatch({ type: "UPLOAD_START" });

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const uploadId = `upload-${Date.now()}-${i}`;

        dispatch({
          type: "UPLOAD_PROGRESS",
          payload: {
            id: uploadId,
            filename: file.name,
            progress: 0,
            status: "uploading",
          },
        });

        try {
          // Validate file size
          if (file.size > settings.maxUploadSize) {
            throw new Error(
              `File ${file.name} exceeds the maximum upload size of ${formatFileSize(settings.maxUploadSize)}`,
            );
          }

          // Validate MIME type
          if (
            settings.allowedMimeTypes.length > 0 &&
            !settings.allowedMimeTypes.includes(file.type)
          ) {
            throw new Error(`File type ${file.type} is not allowed`);
          }

          dispatch({
            type: "UPLOAD_PROGRESS",
            payload: {
              id: uploadId,
              filename: file.name,
              progress: 50,
              status: "uploading",
            },
          });

          const mediaItem = await onUpload(file);

          dispatch({
            type: "UPLOAD_COMPLETE",
            payload: {
              id: uploadId,
              filename: file.name,
              progress: 100,
              status: "complete",
              mediaItem,
            },
          });

          dispatch({ type: "ADD_ITEM", payload: mediaItem });
        } catch (err) {
          dispatch({
            type: "UPLOAD_FAILED",
            payload: {
              id: uploadId,
              filename: file.name,
              progress: 0,
              status: "failed",
              error: err instanceof Error ? err.message : "Upload failed",
            },
          });
        }
      }

      // Auto‑reset upload queue after a delay
      setTimeout(() => dispatch({ type: "UPLOAD_RESET" }), 3000);
    },
    [onUpload, settings.maxUploadSize, settings.allowedMimeTypes],
  );

  /* ── Drag‑and‑drop ──────────────────────────────────────────────── */

  useEffect(() => {
    if (!settings.enableDragDrop) return;

    const el = dropRef.current;
    if (!el) return;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDragOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragOver(false);
      if (e.dataTransfer?.files?.length) {
        handleFiles(e.dataTransfer.files);
      }
    };

    el.addEventListener("dragenter", handleDragEnter);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);

    return () => {
      el.removeEventListener("dragenter", handleDragEnter);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  }, [settings.enableDragDrop, handleFiles]);

  /* ── Paste upload ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!settings.enablePasteUpload) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFiles(files);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [settings.enablePasteUpload, handleFiles]);

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + A: select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        dispatch({ type: "SELECT_ALL" });
      }

      // Escape: deselect all / close detail / close edit
      if (e.key === "Escape") {
        if (state.editItem) {
          dispatch({ type: "SET_EDIT", payload: null });
        } else if (state.detailItem) {
          dispatch({ type: "SET_DETAIL", payload: null });
        } else if (state.selectedIds.size > 0) {
          dispatch({ type: "DESELECT_ALL" });
        }
      }

      // Delete: delete selected
      if (e.key === "Delete" && state.selectedIds.size > 0) {
        e.preventDefault();
        dispatch({
          type: "SET_DELETE_CONFIRM",
          payload: { show: true, ids: Array.from(state.selectedIds) },
        });
      }

      // G: toggle grid/list view
      if (e.key === "g" && !e.ctrlKey && !e.metaKey) {
        dispatch({
          type: "SET_VIEW_MODE",
          payload: state.viewMode === "grid" ? "list" : "grid",
        });
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.selectedIds, state.editItem, state.detailItem, state.viewMode]);

  /* ── Handlers ───────────────────────────────────────────────────── */

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        handleFiles(e.target.files);
        e.target.value = ""; // reset for re-selecting same file
      }
    },
    [handleFiles],
  );

  const handleItemClick = useCallback(
    (item: MediaItem) => {
      if (isPicker) {
        if (multiSelect) {
          dispatch({ type: "TOGGLE_SELECT", payload: item.id });
        } else {
          onSelect?.([item]);
        }
      } else {
        dispatch({ type: "SET_DETAIL", payload: item });
      }
    },
    [isPicker, multiSelect, onSelect],
  );

  const handleToggleSelect = useCallback(
    (id: string, e: React.SyntheticEvent) => {
      e.stopPropagation();
      dispatch({ type: "TOGGLE_SELECT", payload: id });
    },
    [],
  );

  const handleDelete = useCallback(async () => {
    const ids = state.deleteTargetIds;
    try {
      if (ids.length > 1 && onBulkDelete) {
        await onBulkDelete(ids);
      } else {
        for (const id of ids) {
          await onDelete(id);
        }
      }
      dispatch({ type: "REMOVE_ITEMS", payload: ids });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Delete failed",
      });
    } finally {
      dispatch({
        type: "SET_DELETE_CONFIRM",
        payload: { show: false, ids: [] },
      });
    }
  }, [state.deleteTargetIds, onDelete, onBulkDelete]);

  const handleUpdate = useCallback(
    async (id: string, data: UpdateMediaInput) => {
      const updated = await onUpdate(id, data);
      dispatch({ type: "UPDATE_ITEM", payload: updated });
    },
    [onUpdate],
  );

  const handleCopyUrl = useCallback((item: MediaItem) => {
    navigator.clipboard
      .writeText(item.url)
      .then(() => {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      })
      .catch(() => {});
  }, []);

  const handleUrlUpload = useCallback(
    async (url: string) => {
      if (!onUploadFromUrl) return;
      const item = await onUploadFromUrl(url);
      dispatch({ type: "ADD_ITEM", payload: item });
    },
    [onUploadFromUrl],
  );

  const handleCreateFolder = useCallback(
    async (name: string) => {
      if (!onCreateFolder) return;
      try {
        const folder = await onCreateFolder(name);
        dispatch({
          type: "SET_FOLDERS",
          payload: [...state.folders, folder],
        });
        setShowCreateFolder(false);
      } catch (err) {
        dispatch({
          type: "SET_ERROR",
          payload:
            err instanceof Error ? err.message : "Failed to create folder",
        });
      }
    },
    [onCreateFolder, state.folders],
  );

  const handleSelectAllToggle = useCallback(() => {
    const allSelected =
      state.items.length > 0 &&
      state.items.every((i) => state.selectedIds.has(i.id));
    if (allSelected) {
      dispatch({ type: "DESELECT_ALL" });
    } else {
      dispatch({ type: "SELECT_ALL" });
    }
  }, [state.items, state.selectedIds]);

  const handlePickerConfirm = useCallback(() => {
    if (!onSelect) return;
    const selected = state.items.filter((i) => state.selectedIds.has(i.id));
    onSelect(selected);
  }, [onSelect, state.items, state.selectedIds]);

  /* ── Accepted MIME string ───────────────────────────────────────── */

  const acceptString = useMemo(() => {
    if (accept) return accept;
    if (settings.allowedMimeTypes.length > 0) {
      return settings.allowedMimeTypes.join(",");
    }
    return undefined;
  }, [accept, settings.allowedMimeTypes]);

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div
      className={`mm-root ${className || ""}`}
      ref={dropRef}
      data-mode={mode}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileInputChange}
        className="mm-sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Toolbar */}
      <Toolbar
        state={state}
        dispatch={dispatch}
        settings={settings}
        onUploadClick={handleUploadClick}
        onToggleSidebar={() =>
          dispatch({ type: "SET_SIDEBAR", payload: !state.sidebarOpen })
        }
      />

      {/* Upload from URL button (placed after toolbar) */}
      {settings.enableUrlUpload && onUploadFromUrl && (
        <div style={{ display: "flex", gap: "0.5rem", padding: "0 1rem" }}>
          <button
            className="mm-btn mm-btn--ghost mm-btn--sm"
            onClick={() => setShowUrlUpload(true)}
          >
            <Link2 size={14} />
            Upload from URL
          </button>
        </div>
      )}

      {/* Upload progress */}
      <UploadProgressBar queue={state.uploadQueue} />

      {/* Bulk actions bar */}
      {settings.enableBulkOperations &&
        state.selectedIds.size > 0 &&
        !isPicker && (
          <BulkActionsBar
            count={state.selectedIds.size}
            onSelectAll={() => dispatch({ type: "SELECT_ALL" })}
            onDeselectAll={() => dispatch({ type: "DESELECT_ALL" })}
            onDelete={() =>
              dispatch({
                type: "SET_DELETE_CONFIRM",
                payload: {
                  show: true,
                  ids: Array.from(state.selectedIds),
                },
              })
            }
            onDownload={
              onDownload
                ? () => onDownload(Array.from(state.selectedIds))
                : undefined
            }
            totalItems={state.items.length}
          />
        )}

      {/* Error banner */}
      {state.error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1rem",
            background: "var(--mm-danger-light)",
            borderBottom: "1px solid var(--mm-danger)",
            fontSize: "0.8125rem",
            color: "var(--mm-danger)",
          }}
        >
          <AlertTriangle size={14} />
          <span style={{ flex: 1 }}>{state.error}</span>
          <button
            className="mm-btn mm-btn--ghost mm-btn--icon mm-btn--sm"
            onClick={() => dispatch({ type: "SET_ERROR", payload: null })}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main layout */}
      <div className="mm-layout" style={{ position: "relative" }}>
        {/* Folder sidebar */}
        {settings.enableFolders && (
          <aside
            className={`mm-sidebar ${state.sidebarOpen ? "" : "mm-sidebar--collapsed"}`}
          >
            <FolderSidebar
              folders={state.folders}
              currentFolder={state.currentFolder}
              onSelect={(id) => dispatch({ type: "SET_FOLDER", payload: id })}
              onCreateFolder={
                onCreateFolder ? () => setShowCreateFolder(true) : undefined
              }
            />
          </aside>
        )}

        {/* Content area */}
        <div className="mm-main">
          {/* Drop zone overlay */}
          <div
            className={`mm-dropzone ${isDragOver ? "mm-dropzone--active" : ""}`}
            style={{
              flex: "1 1 0%",
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            <div className="mm-dropzone__overlay">
              <UploadCloud className="mm-dropzone__icon" />
              <span className="mm-dropzone__text">Drop files to upload</span>
            </div>

            {/* Loading */}
            {state.isLoading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem",
                  flex: 1,
                }}
              >
                <span
                  className="mm-spinner"
                  style={{ width: 24, height: 24 }}
                />
                <span
                  style={{
                    marginLeft: "0.5rem",
                    color: "var(--mm-text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  Loading…
                </span>
              </div>
            )}

            {/* Content */}
            {!state.isLoading && (
              <div className="mm-content">
                {state.viewMode === "grid" ? (
                  <MediaGrid
                    items={state.items}
                    selectedIds={state.selectedIds}
                    onToggleSelect={handleToggleSelect}
                    onItemClick={handleItemClick}
                  />
                ) : (
                  <MediaList
                    items={state.items}
                    selectedIds={state.selectedIds}
                    sort={state.sort}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAllToggle}
                    onItemClick={handleItemClick}
                    onSort={(s) => dispatch({ type: "SET_SORT", payload: s })}
                  />
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            page={state.page}
            totalItems={state.totalItems}
            pageSize={state.pageSize}
            onChange={(p) => dispatch({ type: "SET_PAGE", payload: p })}
          />
        </div>

        {/* Detail sidebar */}
        {!isPicker && state.detailItem && (
          <aside
            className={`mm-detail-panel ${
              state.detailItem ? "" : "mm-detail-panel--closed"
            }`}
          >
            <DetailPanel
              item={state.detailItem}
              onClose={() => dispatch({ type: "SET_DETAIL", payload: null })}
              onEdit={() =>
                dispatch({ type: "SET_EDIT", payload: state.detailItem })
              }
              onDelete={() =>
                dispatch({
                  type: "SET_DELETE_CONFIRM",
                  payload: {
                    show: true,
                    ids: [state.detailItem!.id],
                  },
                })
              }
              onCopyUrl={() => handleCopyUrl(state.detailItem!)}
              onDownload={
                onDownload
                  ? () => onDownload([state.detailItem!.id])
                  : undefined
              }
              seoAudit={seoAudit}
            />
          </aside>
        )}
      </div>

      {/* Picker confirm bar */}
      {isPicker && multiSelect && state.selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1rem",
            borderTop: "1px solid var(--mm-border)",
            background: "var(--mm-bg-secondary)",
          }}
        >
          <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
            {state.selectedIds.size} selected
          </span>
          <span className="mm-toolbar__spacer" />
          <button
            className="mm-btn"
            onClick={() => dispatch({ type: "DESELECT_ALL" })}
          >
            Clear
          </button>
          <button
            className="mm-btn mm-btn--primary"
            onClick={handlePickerConfirm}
          >
            <Check size={14} />
            Confirm selection
          </button>
        </div>
      )}

      {/* Copy feedback toast */}
      {copyFeedback && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            padding: "0.5rem 1rem",
            background: "var(--mm-text)",
            color: "var(--mm-bg)",
            borderRadius: "var(--mm-radius)",
            fontSize: "0.8125rem",
            fontWeight: 500,
            zIndex: 300,
            boxShadow: "var(--mm-shadow-lg)",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <Check size={14} />
          URL copied to clipboard
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────────────────── */}

      {/* Edit modal */}
      {state.editItem && (
        <EditModal
          item={state.editItem}
          onSave={handleUpdate}
          onClose={() => dispatch({ type: "SET_EDIT", payload: null })}
        />
      )}

      {/* URL upload modal */}
      {showUrlUpload && (
        <UrlUploadModal
          onUpload={handleUrlUpload}
          onClose={() => setShowUrlUpload(false)}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        show={state.showDeleteConfirm}
        title="Delete media"
        message={
          state.deleteTargetIds.length === 1
            ? "Are you sure you want to delete this item? This action cannot be undone."
            : `Are you sure you want to delete ${state.deleteTargetIds.length} items? This action cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() =>
          dispatch({
            type: "SET_DELETE_CONFIRM",
            payload: { show: false, ids: [] },
          })
        }
      />

      {/* Create folder dialog */}
      <CreateFolderDialog
        show={showCreateFolder}
        onConfirm={handleCreateFolder}
        onCancel={() => setShowCreateFolder(false)}
      />
    </div>
  );
}

export default MediaManager;
