// tags/schemas.ts
// Zod validation schemas — replaces class-validator DTOs
// Usage: schemas.createTag.parse(body) in route handlers

import { z } from 'zod';
import { TagSortField } from '../types';

// ─── Slug helper ────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ─── Create Tag ─────────────────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(100, 'Name must not exceed 100 chars'),
  slug: z.string().regex(slugRegex, 'Invalid slug format').max(200).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value').optional(),
  icon: z.string().max(100).optional(),
  parentId: z.string().optional(),
  featured: z.boolean().optional(),
  protected: z.boolean().optional(),
  synonyms: z.array(z.string().max(100)).max(20).optional(),
  linkedTagIds: z.array(z.string()).max(10).optional(),
  locked: z.boolean().optional(),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
  ogImage: z.string().url().optional(),
});

// ─── Update Tag ─────────────────────────────────────────────────────────────

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().regex(slugRegex).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  icon: z.string().max(100).nullable().optional(),
  parentId: z.string().nullable().optional(),
  featured: z.boolean().optional(),
  protected: z.boolean().optional(),
  synonyms: z.array(z.string().max(100)).max(20).optional(),
  linkedTagIds: z.array(z.string()).max(10).optional(),
  locked: z.boolean().optional(),
  forceUnlock: z.boolean().optional(),
  metaTitle: z.string().max(160).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  ogImage: z.string().url().nullable().optional(),
});

// ─── Query / Filter ─────────────────────────────────────────────────────────

export const queryTagsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  sortBy: z.nativeEnum(TagSortField).default(TagSortField.NAME),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
  trending: z.coerce.boolean().optional(),
  parentId: z.string().nullable().optional(),
  hideEmpty: z.coerce.boolean().optional(),
}).partial();

// ─── Merge ──────────────────────────────────────────────────────────────────

export const mergeTagsSchema = z.object({
  sourceIds: z.array(z.string()).min(1, 'At least one source tag').max(100),
  targetId: z.string().min(1, 'Target tag ID is required'),
});

// ─── Bulk Ops ───────────────────────────────────────────────────────────────

export const bulkIdsSchema = z.object({
  tagIds: z.array(z.string()).min(1).max(100),
});

export const bulkStyleSchema = bulkIdsSchema.extend({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(100).optional(),
  featured: z.boolean().optional(),
});

export const bulkParentSchema = bulkIdsSchema.extend({
  parentId: z.string().nullable(),
});

export const bulkLockSchema = bulkIdsSchema.extend({
  locked: z.boolean(),
});

export const bulkDeleteSchema = bulkIdsSchema;

export const bulkMergeDuplicatesSchema = z.object({
  /** Similarity threshold (0.0–1.0). Pairs scoring >= this merge automatically. */
  threshold: z.number().min(0.1).max(1.0).default(0.85).optional(),
  /** If true, perform a dry run — return groups without actually merging. */
  dryRun: z.boolean().default(false).optional(),
  /** Optional list of tag IDs to exclude from merging (e.g. protected tags). */
  excludeIds: z.array(z.string()).max(500).optional(),
});

// ─── Follow ─────────────────────────────────────────────────────────────────

export const followTagSchema = z.object({
  tagId: z.string().min(1),
  weight: z.number().min(0).max(100).default(1).optional(),
});

// ─── Auto-Tag ───────────────────────────────────────────────────────────────

export const smartAutoTagSchema = z.object({
  maxTags: z.number().int().min(1).max(20).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  useLlm: z.boolean().optional(),
  syncRelation: z.boolean().optional(),
});

export const batchAutoTagSchema = z.object({
  maxPosts: z.number().int().min(1).max(200).optional(),
  minTagsRequired: z.number().int().min(0).optional(),
  useLlm: z.boolean().optional(),
});

export const suggestTagsSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000),
  maxSuggestions: z.number().int().min(1).max(30).optional(),
});

// ─── Autocomplete (Tagulous-inspired) ─────────────────────────────────

export const autocompleteSchema = z.object({
  q: z.string().min(0, 'Query is required').max(200),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  mode: z.enum(['startsWith', 'contains']).default('startsWith').optional(),
  parentId: z.string().nullable().optional(),
  includeCount: z.coerce.boolean().default(true).optional(),
});

// ─── Tag Cloud ──────────────────────────────────────────────────────────

export const tagCloudSchema = z.object({
  minWeight: z.coerce.number().int().min(1).default(1).optional(),
  maxWeight: z.coerce.number().int().min(1).default(6).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100).optional(),
  parentId: z.string().nullable().optional(),
});

// ─── Tag String Parser ─────────────────────────────────────────────────

export const parseTagStringSchema = z.object({
  tagString: z.string().max(5000),
  spaceDelimiter: z.boolean().default(true).optional(),
  maxCount: z.number().int().min(0).default(0).optional(),
  forceLowercase: z.boolean().default(false).optional(),
});

// ─── Admin Dynamic Settings ────────────────────────────────────────────

export const updateTagSettingsSchema = z.object({
  caseSensitive: z.boolean().optional(),
  forceLowercase: z.boolean().optional(),
  spaceDelimiter: z.boolean().optional(),
  maxTagsPerPost: z.number().int().min(0).max(100).optional(),
  autocompleteLimit: z.number().int().min(1).max(100).optional(),
  autocompleteMode: z.enum(['startsWith', 'contains']).optional(),
  autocompleteMinChars: z.number().int().min(0).max(10).optional(),
  protectAll: z.boolean().optional(),
  protectInitial: z.boolean().optional(),
  initialTags: z.array(z.string().max(100)).max(200).optional(),
  tagCloudMin: z.number().int().min(1).max(10).optional(),
  tagCloudMax: z.number().int().min(1).max(20).optional(),
  enableTree: z.boolean().optional(),
  treeSeparator: z.string().min(1).max(3).optional(),
  enableFollowing: z.boolean().optional(),
  autoTagMaxTags: z.number().int().min(1).max(30).optional(),
  autoTagMinConfidence: z.number().min(0).max(1).optional(),
  enableLlmAutoTag: z.boolean().optional(),
  autoCleanupDays: z.number().int().min(0).max(365).optional(),
  maxNameLength: z.number().int().min(10).max(500).optional(),
  maxDescriptionLength: z.number().int().min(50).max(5000).optional(),
  maxSynonyms: z.number().int().min(0).max(100).optional(),
  maxLinkedTags: z.number().int().min(0).max(50).optional(),
  maxBulkIds: z.number().int().min(1).max(500).optional(),
});

// ─── Initial Tags Loader ────────────────────────────────────────────────

export const loadInitialTagsSchema = z.object({
  tags: z.array(z.object({
    name: z.string().min(1).max(100),
    slug: z.string().regex(slugRegex).max(200).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    parentName: z.string().max(100).optional(),
    protected: z.boolean().default(true).optional(),
  })).max(500),
  protectInitial: z.boolean().default(true).optional(),
});

// ─── Inferred Types ─────────────────────────────────────────────────────────

export type CreateTagPayload = z.infer<typeof createTagSchema>;
export type UpdateTagPayload = z.infer<typeof updateTagSchema>;
export type QueryTagsPayload = z.infer<typeof queryTagsSchema>;
export type MergeTagsPayload = z.infer<typeof mergeTagsSchema>;
export type BulkIdsPayload = z.infer<typeof bulkIdsSchema>;
export type BulkStylePayload = z.infer<typeof bulkStyleSchema>;
export type BulkParentPayload = z.infer<typeof bulkParentSchema>;
export type BulkLockPayload = z.infer<typeof bulkLockSchema>;
export type BulkDeletePayload = z.infer<typeof bulkDeleteSchema>;
export type BulkMergeDuplicatesPayload = z.infer<typeof bulkMergeDuplicatesSchema>;
export type FollowTagPayload = z.infer<typeof followTagSchema>;
export type SmartAutoTagPayload = z.infer<typeof smartAutoTagSchema>;
export type BatchAutoTagPayload = z.infer<typeof batchAutoTagSchema>;
export type SuggestTagsPayload = z.infer<typeof suggestTagsSchema>;
export type AutocompletePayload = z.infer<typeof autocompleteSchema>;
export type TagCloudPayload = z.infer<typeof tagCloudSchema>;
export type ParseTagStringPayload = z.infer<typeof parseTagStringSchema>;
export type UpdateTagSettingsPayload = z.infer<typeof updateTagSettingsSchema>;
export type LoadInitialTagsPayload = z.infer<typeof loadInitialTagsSchema>;
