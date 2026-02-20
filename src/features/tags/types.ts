// tags/types.ts
// All enums, interfaces, input types — zero external dependencies
// Source of truth for the entire tags module

// ─── Enums ──────────────────────────────────────────────────────────────────

export enum TagSortField {
  NAME = "name",
  SLUG = "slug",
  USAGE_COUNT = "usageCount",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  SYNONYM_HITS = "synonymHits",
  WEIGHT = "weight",
}

export enum AutocompleteMode {
  STARTS_WITH = "startsWith",
  CONTAINS = "contains",
}

export enum TagEvent {
  CREATED = "TAG_CREATED",
  UPDATED = "TAG_UPDATED",
  DELETED = "TAG_DELETED",
  MERGED = "TAG_MERGED",
  LOCKED = "TAG_LOCKED",
  UNLOCKED = "TAG_UNLOCKED",
  FEATURED = "TAG_FEATURED",
  UNFEATURED = "TAG_UNFEATURED",
  TRENDING_UPDATED = "TAG_TRENDING_UPDATED",
  AUTO_TAGGED = "TAG_AUTO_TAGGED",
  SYNONYMS_GENERATED = "TAG_SYNONYMS_GENERATED",
  BULK_UPDATED = "TAG_BULK_UPDATED",
  ORPHANS_CLEANED = "TAG_ORPHANS_CLEANED",
  FOLLOWED = "TAG_FOLLOWED",
  UNFOLLOWED = "TAG_UNFOLLOWED",
  INITIAL_LOADED = "TAG_INITIAL_LOADED",
  SETTINGS_UPDATED = "TAG_SETTINGS_UPDATED",
  PROTECTED = "TAG_PROTECTED",
}

// ─── Core Data Shapes ───────────────────────────────────────────────────────

export interface TagData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  icon: string | null;

  // SEO
  metaTitle: string | null;
  metaDescription: string | null;
  ogImage: string | null;

  // Hierarchy
  parentId: string | null;

  // Tree path (Tagulous-inspired)
  path: string | null; // full slug path e.g. "animal/mammal/cat"
  label: string | null; // last segment e.g. "Cat"
  level: number; // depth in tree (1 = root)

  // Metadata
  usageCount: number;
  featured: boolean;
  trending: boolean;
  locked: boolean;
  protected: boolean; // prevents auto-cleanup when count=0 (Tagulous)

  // Synonyms & companions
  synonyms: string[];
  synonymHits: number;
  linkedTagIds: string[];

  // Merge tracking
  mergeCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface TagWithRelations extends TagData {
  posts?: Array<{ id: string }>;
  parent?: TagData | null;
  children?: TagData[];
  _count?: {
    posts: number;
    children: number;
    followers: number;
  };
}

export interface TagFollowWithTag extends TagFollowData {
  tag: TagData;
}

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

export interface TagFollowData {
  id: string;
  tagId: string;
  userId: string;
  weight: number;
  createdAt: Date;
}

// ─── Autocomplete (Tagulous-inspired) ───────────────────────────────────

export interface AutocompleteQuery {
  q: string; // search query typed by user
  page?: number; // pagination
  limit?: number; // max results per page (autocompleteLimit)
  mode?: AutocompleteMode; // startsWith (default) | contains
  parentId?: string | null; // scope to children of a parent
  includeCount?: boolean; // include usage count in results
}

export interface AutocompleteResult {
  id: string;
  name: string;
  slug: string;
  path: string | null;
  color: string | null;
  icon: string | null;
  usageCount: number;
  isExisting: true;
}

export interface AutocompleteResponse {
  results: AutocompleteResult[];
  total: number;
  page: number;
  hasMore: boolean;
}

// ─── Tag Cloud (Tagulous-inspired) ──────────────────────────────────────

export interface TagCloudItem {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  usageCount: number;
  weight: number; // normalized weight between weightMin..weightMax
}

// ─── Tag String Parser ──────────────────────────────────────────────────

export interface ParseTagsOptions {
  spaceDelimiter?: boolean; // allow spaces as delimiters (default: true)
  maxCount?: number; // max tags allowed (0 = no limit)
  forceLowercase?: boolean; // force all tags lowercase
}

// ─── Admin Dynamic Settings (DB-backed runtime config) ──────────────────

export interface TagSystemSettings {
  id: string;

  // Core behavior
  caseSensitive: boolean; // whether tag names are case-sensitive
  forceLowercase: boolean; // force all tag names to lowercase
  spaceDelimiter: boolean; // allow spaces as tag delimiters
  maxTagsPerPost: number; // max count per post (0 = unlimited)

  // Autocomplete
  autocompleteLimit: number; // max suggestions per page
  autocompleteMode: AutocompleteMode;
  autocompleteMinChars: number; // min chars before triggering autocomplete

  // Protection
  protectAll: boolean; // protect ALL count=0 tags from auto-delete
  protectInitial: boolean; // protect initial/seed tags from deletion

  // Initial / seed tags (comma-separated or JSON array)
  initialTags: string[]; // predefined seed tags

  // Tag cloud
  tagCloudMin: number; // min weight for tag cloud
  tagCloudMax: number; // max weight for tag cloud

  // Hierarchy / tree
  enableTree: boolean; // enable slash-delimited tree tags
  treeSeparator: string; // separator character (default: "/")

  // Following
  enableFollowing: boolean;

  // Auto-tagging
  autoTagMaxTags: number;
  autoTagMinConfidence: number;
  enableLlmAutoTag: boolean;

  // Cleanup
  autoCleanupDays: number; // auto-clean orphans older than N days (0 = off)

  // Limits
  maxNameLength: number;
  maxDescriptionLength: number;
  maxSynonyms: number;
  maxLinkedTags: number;
  maxBulkIds: number;

  // Metadata
  updatedAt: Date;
  updatedBy: string | null;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface TagAnalytics {
  totalTags: number;
  orphanedTags: number;
  duplicateCandidates: number;
  avgUsageCount: number;
  topTags: TagSummary[];
  recentlyCreated: Array<{ id: string; name: string; createdAt: Date }>;
  unusedTags: Array<{ id: string; name: string; createdAt: Date }>;
  tagsByParent: Array<{ parentName: string | null; count: number }>;
  synonymUtilization: {
    totalSynonyms: number;
    totalHits: number;
    avgHitsPerTag: number;
  };
  healthScore: number;
  recommendations: string[];
}

export interface DuplicateCandidate {
  a: TagSummary;
  b: TagSummary;
  score: number;
}

export interface DuplicateGroup {
  /** The survivor tag — highest usageCount in the group. */
  survivor: TagSummary;
  /** Tags that will be merged into the survivor. */
  duplicates: TagSummary[];
  /** Max similarity score within the group. */
  maxScore: number;
}

export interface BulkMergeResult {
  /** Number of duplicate groups that were merged. */
  groupsMerged: number;
  /** Total number of source tags deleted. */
  tagsDeleted: number;
  /** Details per merge. */
  merges: Array<{
    survivorId: string;
    survivorName: string;
    mergedIds: string[];
    postsRelinked: number;
  }>;
}

// ─── Auto-Tagging ───────────────────────────────────────────────────────────

export interface AutoTagResult {
  tags: string[];
  source: "llm" | "keyword";
  confidence: number[];
}

export interface TagSuggestion {
  name: string;
  slug: string;
  id?: string;
  isExisting: boolean;
  confidence: number;
}

export interface BatchAutoTagResult {
  processed: number;
  tagged: number;
  errors: number;
  details: Array<{
    postId: string;
    title: string;
    tagsAdded: number;
    source: string;
  }>;
}

// ─── Service Input Types ────────────────────────────────────────────────────

export interface CreateTagInput {
  name: string;
  slug?: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  featured?: boolean;
  protected?: boolean;
  synonyms?: string[];
  linkedTagIds?: string[];
  locked?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

export interface UpdateTagInput {
  name?: string;
  slug?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  parentId?: string | null;
  featured?: boolean;
  protected?: boolean;
  synonyms?: string[];
  linkedTagIds?: string[];
  locked?: boolean;
  forceUnlock?: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
}

export interface QueryTagsInput {
  page?: number;
  limit?: number;
  sortBy?: TagSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  featured?: boolean;
  trending?: boolean;
  parentId?: string | null;
  hideEmpty?: boolean;
}

export interface MergeTagsInput {
  sourceIds: string[];
  targetId: string;
}

export interface BulkStyleInput {
  tagIds: string[];
  color?: string;
  icon?: string;
  featured?: boolean;
}

export interface BulkParentInput {
  tagIds: string[];
  parentId: string | null;
}

export interface BulkLockInput {
  tagIds: string[];
  locked: boolean;
}

export interface FollowTagInput {
  tagId: string;
  userId: string;
  weight?: number;
}

export interface SmartAutoTagInput {
  postId: string;
  maxTags?: number;
  minConfidence?: number;
  useLlm?: boolean;
  syncRelation?: boolean;
}

// ─── Pagination ─────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── API Response Envelope ──────────────────────────────────────────────────

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiError = { ok: false; error: string; details?: unknown };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── LLM Interface ─────────────────────────────────────────────────────────

export interface LlmService {
  executeTask(params: {
    taskType: string;
    prompt: string;
    maxTokens: number;
    temperature: number;
  }): Promise<{ result: Record<string, unknown> }>;
}

// ─── Config ─────────────────────────────────────────────────────────────────

export interface TagsConfig {
  maxNameLength?: number;
  maxDescriptionLength?: number;
  maxSlugLength?: number;
  maxSynonyms?: number;
  maxLinkedTags?: number;
  maxBulkIds?: number;
  defaultColor?: string;
  trendingWindowDays?: number;
  trendingLimit?: number;
  duplicateThreshold?: number;
  autoTagMaxTags?: number;
  autoTagMinConfidence?: number;
  enableFollowing?: boolean;

  // Tagulous-inspired additions
  caseSensitive?: boolean;
  forceLowercase?: boolean;
  spaceDelimiter?: boolean;
  maxTagsPerPost?: number;
  autocompleteLimit?: number;
  autocompleteMode?: AutocompleteMode;
  autocompleteMinChars?: number;
  protectAll?: boolean;
  protectInitial?: boolean;
  initialTags?: string[];
  tagCloudMin?: number;
  tagCloudMax?: number;
  enableTree?: boolean;
  treeSeparator?: string;
  autoCleanupDays?: number;
  enableLlmAutoTag?: boolean;
}

// ─── Minimal Prisma Interface (DI boundary) ─────────────────────────────────

import type { PrismaDelegate } from "@/shared/prisma-delegate.types";
export type { PrismaDelegate };

export interface TagsPrismaClient {
  tag: PrismaDelegate<TagData>;
  tagFollow: PrismaDelegate<TagFollowData>;
  tagSettings: PrismaDelegate;
  post: PrismaDelegate;
  $transaction<T>(fn: (tx: TagsPrismaClient) => Promise<T>): Promise<T>;
}
