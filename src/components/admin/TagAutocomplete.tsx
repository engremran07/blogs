"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, TrendingUp, Star, Search, Plus } from "lucide-react";
import { toast } from "@/components/ui/Toast";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface AutocompleteResult {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  description: string | null;
  usageCount: number;
  trending: boolean;
  featured: boolean;
  fuzzy?: boolean;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface TagAutocompleteProps {
  /** Currently selected tag IDs */
  selectedTagIds: string[];
  /** Selected tag objects (for displaying pills on load) */
  selectedTags?: TagItem[];
  /** Called when the set of selected tag IDs changes */
  onTagsChange: (tagIds: string[], tags: TagItem[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Maximum tags allowed (0 = unlimited) */
  maxTags?: number;
}

/* ─── Debounce ──────────────────────────────────────────────────────────── */

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function TagAutocomplete({
  selectedTagIds,
  selectedTags = [],
  onTagsChange,
  placeholder = "Type to search tags...",
  maxTags = 0,
}: TagAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AutocompleteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const processingRef = useRef(false);

  // Keep refs in sync so async callbacks always see latest values.
  // Direct assignment runs during render (before effects) so there's
  // no window where a callback could read stale data.
  const latestTagsRef = useRef(selectedTags);
  const latestIdsRef = useRef(selectedTagIds);
  latestTagsRef.current = selectedTags;
  latestIdsRef.current = selectedTagIds;

  const debouncedQuery = useDebouncedValue(query.trim(), 200);

  // Use selectedTags prop directly — no internal tag state needed.
  // Parent is the single source of truth.
  const tags = selectedTags;

  // ─── Find-or-Create helper ───────────────────────────────────────────
  // Given a tag name, returns a TagItem by: 1) searching autocomplete,
  // 2) trying to create, 3) retrying search if create fails (duplicate).
  // This ensures we ALWAYS get the tag if it exists in the DB.
  async function findOrCreateTag(name: string): Promise<TagItem | null> {
    const lower = name.toLowerCase();
    const slugified = lower.replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    // Step 1: Search by name
    try {
      const res = await fetch(
        `/api/tags/autocomplete?q=${encodeURIComponent(name)}&limit=10`,
      );
      const data = await res.json();
      if (data.success && data.results) {
        const match = (data.results as AutocompleteResult[]).find(
          (r) =>
            r.name.toLowerCase() === lower || r.slug === slugified,
        );
        if (match) {
          return { id: match.id, name: match.name, slug: match.slug };
        }
      }
    } catch {
      // continue to create
    }

    // Step 2: Try to create
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        return {
          id: data.data.id,
          name: data.data.name,
          slug: data.data.slug,
        };
      }

      // Step 3: Create failed (probably duplicate) — search again by slug
      // The autocomplete might not have found it before due to fuzzy matching
      try {
        const retryRes = await fetch(
          `/api/tags/autocomplete?q=${encodeURIComponent(slugified)}&limit=10`,
        );
        const retryData = await retryRes.json();
        if (retryData.success && retryData.results) {
          const match = (retryData.results as AutocompleteResult[]).find(
            (r) =>
              r.name.toLowerCase() === lower || r.slug === slugified,
          );
          if (match) {
            return { id: match.id, name: match.name, slug: match.slug };
          }
        }
      } catch {
        // give up
      }
    } catch {
      toast("Network error creating tag", "error");
    }

    return null;
  }

  // Fetch autocomplete results via callback (avoids set-state-in-effect)
  const fetchAutocomplete = useCallback(
    async (q: string, isInitial: boolean) => {
      setLoading(true);
      try {
        const url = isInitial
          ? "/api/tags/autocomplete?action=initial&limit=15"
          : `/api/tags/autocomplete?q=${encodeURIComponent(q)}&limit=15`;
        const res = await fetch(url);
        const d = await res.json();
        if (d.success) {
          setResults(
            (d.results || []).filter(
              (r: AutocompleteResult) => !selectedTagIds.includes(r.id),
            ),
          );
          if (!isInitial) setOpen(true);
        }
      } catch {
        // silently ignore
      } finally {
        setLoading(false);
      }
    },
    [selectedTagIds],
  );

  // Trigger fetch when debounced query changes or dropdown opens
  useEffect(() => {
    if (!debouncedQuery) {
      if (open) {
        fetchAutocomplete("", true);
      } else {
        setResults([]);
      }
      return;
    }
    fetchAutocomplete(debouncedQuery, false);
  }, [debouncedQuery, open, fetchAutocomplete]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIdx]) {
        (items[highlightIdx] as HTMLElement).scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIdx]);

  const selectTag = useCallback(
    (tag: AutocompleteResult | TagItem) => {
      if (maxTags > 0 && selectedTagIds.length >= maxTags) return;
      if (selectedTagIds.includes(tag.id)) return;

      const newItem: TagItem = { id: tag.id, name: tag.name, slug: tag.slug };
      const nextTags = [...tags, newItem];
      const nextIds = [...selectedTagIds, tag.id];
      onTagsChange(nextIds, nextTags);
      setQuery("");
      setHighlightIdx(-1);
      setResults((prev) => prev.filter((r) => r.id !== tag.id));
      inputRef.current?.focus();
    },
    [selectedTagIds, tags, onTagsChange, maxTags],
  );

  const removeTag = useCallback(
    (tagId: string) => {
      const nextTags = tags.filter((t) => t.id !== tagId);
      const nextIds = selectedTagIds.filter((id) => id !== tagId);
      onTagsChange(nextIds, nextTags);
    },
    [selectedTagIds, tags, onTagsChange],
  );

  // Create a brand-new tag via API, then select it
  const createTag = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (processingRef.current) return;
      if (maxTags > 0 && latestIdsRef.current.length >= maxTags) return;

      processingRef.current = true;
      setCreating(true);
      try {
        const tag = await findOrCreateTag(trimmed);
        if (!tag) {
          toast("Could not create tag", "error");
          return;
        }
        if (latestIdsRef.current.includes(tag.id)) {
          toast(`"${tag.name}" is already added`, "info");
          setQuery("");
          return;
        }
        const nextTags = [...latestTagsRef.current, tag];
        const nextIds = [...latestIdsRef.current, tag.id];
        onTagsChange(nextIds, nextTags);
        setQuery("");
        setHighlightIdx(-1);
        setResults((prev) => prev.filter((r) => r.id !== tag.id));
        setOpen(false);
        inputRef.current?.focus();
      } finally {
        processingRef.current = false;
        setCreating(false);
      }
    },
    [onTagsChange, maxTags],
  );

  // Process multiple tag names — find existing or create new ones.
  const processTagNames = useCallback(
    async (names: string[]) => {
      const validNames = names
        .map((n) => n.trim())
        .filter((n) => n.length >= 2);
      if (validNames.length === 0) return;

      if (processingRef.current) return;
      processingRef.current = true;
      setCreating(true);

      try {
        let currentTags = [...latestTagsRef.current];
        let currentIds = [...latestIdsRef.current];
        let addedCount = 0;

        for (const name of validNames) {
          if (maxTags > 0 && currentIds.length >= maxTags) {
            toast(`Max ${maxTags} tags reached`, "info");
            break;
          }

          // Skip if already selected (case-insensitive)
          if (
            currentTags.some(
              (t) => t.name.toLowerCase() === name.toLowerCase(),
            )
          )
            continue;

          const tag = await findOrCreateTag(name);
          if (tag && !currentIds.includes(tag.id)) {
            currentTags = [...currentTags, tag];
            currentIds = [...currentIds, tag.id];
            addedCount++;
          }
        }

        // Update parent if any tags were added
        if (addedCount > 0) {
          onTagsChange(currentIds, currentTags);
          setQuery("");
          setHighlightIdx(-1);
        } else if (validNames.length > 0) {
          // All tags either existed already or failed
          setQuery("");
        }
      } catch {
        toast("Failed to process tags", "error");
      } finally {
        processingRef.current = false;
        setCreating(false);
        inputRef.current?.focus();
      }
    },
    [onTagsChange, maxTags],
  );

  // Whether the current query matches an existing result or already-selected tag
  const trimmedQuery = debouncedQuery.toLowerCase();
  const queryMatchesExisting = results.some(
    (r) => r.name.toLowerCase() === trimmedQuery,
  );
  const queryMatchesSelected = tags.some(
    (t) => t.name.toLowerCase() === trimmedQuery,
  );
  // Show "Create new" when query ≥ 2 chars, not an existing tag, and not already selected
  const showCreateOption =
    debouncedQuery.length >= 2 &&
    !queryMatchesExisting &&
    !queryMatchesSelected;
  // Total items in dropdown (results + optional create row)
  const totalItems = results.length + (showCreateOption ? 1 : 0);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev < totalItems - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) =>
        prev > 0 ? prev - 1 : totalItems - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIdx >= 0 && highlightIdx < results.length) {
        selectTag(results[highlightIdx]);
      } else if (showCreateOption && highlightIdx === results.length) {
        // "Create new" row is highlighted
        createTag(query);
      } else if (query.trim().length >= 2) {
        // No item highlighted — auto-find or create the typed tag
        processTagNames([query.trim()]);
      }
    } else if (e.key === "Tab") {
      if (highlightIdx >= 0 && highlightIdx < results.length) {
        e.preventDefault();
        selectTag(results[highlightIdx]);
      }
    } else if (e.key === "Backspace" && !query && tags.length > 0) {
      // Remove last tag on backspace with empty input
      removeTag(tags[tags.length - 1].id);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const atLimit = maxTags > 0 && selectedTagIds.length >= maxTags;

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tag Pills — scrollable when many tags */}
      {tags.length > 0 && (
        <div className="mb-2 max-h-28 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-white"
              >
                {tag.name}
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/80 focus:outline-none"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
            {tags.length} tag{tags.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            if (value.includes(",")) {
              // Handle pasted comma-separated values
              const segments = value.split(",");
              const lastSegment = (segments.pop() || "").trim();
              const toProcess = segments
                .map((s) => s.trim())
                .filter((s) => s.length >= 2);
              if (toProcess.length > 0) {
                processTagNames(toProcess);
              }
              setQuery(lastSegment);
            } else {
              setQuery(value);
            }
            if (!open) setOpen(true);
            setHighlightIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={atLimit ? `Max ${maxTags} tags reached` : placeholder}
          disabled={atLimit}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-primary"
          autoComplete="off"
        />
        {(loading || creating) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {open && (results.length > 0 || showCreateOption) && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
          role="listbox"
        >
          {results.map((result, idx) => (
            <li
              key={result.id}
              role="option"
              aria-selected={idx === highlightIdx}
              onMouseEnter={() => setHighlightIdx(idx)}
              onClick={() => selectTag(result)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                idx === highlightIdx
                  ? "bg-primary/10 dark:bg-primary/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {/* Color dot */}
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: result.color || "#9ca3af",
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium text-gray-900 dark:text-white">
                    {result.name}
                  </span>
                  {result.trending && (
                    <TrendingUp className="h-3 w-3 shrink-0 text-orange-500" />
                  )}
                  {result.featured && (
                    <Star className="h-3 w-3 shrink-0 text-yellow-500" />
                  )}
                  {result.fuzzy && (
                    <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      ~
                    </span>
                  )}
                </div>
                {result.description && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {result.description}
                  </p>
                )}
              </div>

              <span className="shrink-0 text-xs text-gray-400">
                {result.usageCount}
              </span>
            </li>
          ))}

          {/* Create new tag — landscape card */}
          {showCreateOption && (
            <li
              role="option"
              aria-selected={highlightIdx === results.length}
              onMouseEnter={() => setHighlightIdx(results.length)}
              onClick={() => createTag(query)}
              className={`cursor-pointer border-t border-gray-100 px-3 py-3 transition-colors dark:border-gray-700 ${
                highlightIdx === results.length
                  ? "bg-green-50 dark:bg-green-900/20"
                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-green-300 bg-green-50/60 px-4 py-3 dark:border-green-700 dark:bg-green-900/30">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800/50">
                  <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                    Create new tag
                  </p>
                  <p className="truncate text-xs text-green-600 dark:text-green-400">
                    &ldquo;{query.trim()}&rdquo; will be added as a new tag
                  </p>
                </div>
                {creating ? (
                  <div className="ml-auto h-4 w-4 animate-spin rounded-full border-2 border-green-300 border-t-green-600" />
                ) : (
                  <span className="ml-auto rounded-md bg-green-600 px-2.5 py-1 text-[11px] font-medium text-white dark:bg-green-700">
                    Enter ↵
                  </span>
                )}
              </div>
            </li>
          )}
        </ul>
      )}

      {/* Empty state — only when no results AND no create option */}
      {open && !loading && debouncedQuery && results.length === 0 && !showCreateOption && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white p-3 text-center text-sm text-gray-500 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
          No tags found for &ldquo;{debouncedQuery}&rdquo;
        </div>
      )}

      {/* Max-tags hint (only when scrollable box isn't visible) */}
      {tags.length === 0 && maxTags > 0 && (
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Up to {maxTags} tags allowed
        </p>
      )}

      {/* Comma-separated hint */}
      {!atLimit && (
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          Separate multiple tags with commas or press Enter to add
        </p>
      )}
    </div>
  );
}
