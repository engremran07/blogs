// tags/constants.ts
// All configurable defaults — zero external dependencies

import type { TagsConfig } from '../types';
import { AutocompleteMode } from '../types';

export const DEFAULT_CONFIG: Required<TagsConfig> = {
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxSlugLength: 200,
  maxSynonyms: 20,
  maxLinkedTags: 10,
  maxBulkIds: 100,
  defaultColor: '#3b82f6',
  trendingWindowDays: 30,
  trendingLimit: 10,
  duplicateThreshold: 0.28,
  autoTagMaxTags: 8,
  autoTagMinConfidence: 0.3,
  enableFollowing: true,

  // Tagulous-inspired defaults
  caseSensitive: false,
  forceLowercase: false,
  spaceDelimiter: true,
  maxTagsPerPost: 0,            // 0 = unlimited
  autocompleteLimit: 20,
  autocompleteMode: AutocompleteMode.STARTS_WITH,
  autocompleteMinChars: 1,
  protectAll: false,
  protectInitial: true,
  initialTags: [],
  tagCloudMin: 1,
  tagCloudMax: 6,
  enableTree: true,
  treeSeparator: '/',
  autoCleanupDays: 0,           // 0 = manual only
  enableLlmAutoTag: false,
};

export const STOP_WORDS = new Set([
  'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'been', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
  'those', 'a', 'an', 'not', 'no', 'so', 'if', 'its', 'it',
  'he', 'she', 'we', 'they', 'my', 'our', 'your', 'his', 'her',
  'their', 'which', 'who', 'whom', 'what', 'when', 'where', 'how',
  'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'than', 'too', 'very', 'just', 'about', 'above',
  'after', 'before', 'between', 'into', 'through', 'during', 'out',
  'off', 'over', 'under', 'again', 'then', 'once', 'here', 'there',
  'why', 'any', 'also', 'only', 'own', 'same', 'up', 'down',
]);

export const MODERATOR_ROLES = ['ADMINISTRATOR', 'SUPER_ADMIN', 'EDITOR'] as const;
