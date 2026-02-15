// media-manager/constants.ts
// ─────────────────────────────────────────────────────────────────────────────
// All constants, limits, default configurations, cache‑key generators,
// and pure helper functions for the Media Manager module.
// **Zero external dependencies.**
// ─────────────────────────────────────────────────────────────────────────────

import type {
  MediaConfig,
  MediaType,
  ResolvedMediaAdminSettings,
  VariantPreset,
  VariantPresetConfig,
} from '../types';

/* ====================================================================== *
 *  Limits                                                                *
 * ====================================================================== */

export const MEDIA_LIMITS = {
  /** 50 MB default max upload size (bytes). */
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  /** Maximum items in a single bulk operation. */
  MAX_BULK_ITEMS: 100,

  /** Maximum filename length after sanitisation. */
  MAX_FILENAME_LENGTH: 255,

  /**
   * Maximum alt‑text length — aligned with the SEO module's
   * `IMAGE_ALT_MAX_LENGTH` (seo/constants.ts).
   */
  MAX_ALT_TEXT_LENGTH: 125,

  /** Maximum title length. */
  MAX_TITLE_LENGTH: 200,

  /** Maximum description length. */
  MAX_DESCRIPTION_LENGTH: 1000,

  /** Maximum tags per media item. */
  MAX_TAGS: 30,

  /** Maximum tag length (single tag). */
  MAX_TAG_LENGTH: 50,

  /** Maximum folder nesting depth. */
  MAX_FOLDER_DEPTH: 10,

  /** Maximum folder name length. */
  MAX_FOLDER_NAME_LENGTH: 100,

  /** Minimum search query length. */
  MIN_SEARCH_LENGTH: 2,

  /** Maximum search query length. */
  MAX_SEARCH_LENGTH: 200,

  /** Default page size for listings. */
  DEFAULT_PAGE_SIZE: 30,

  /** Maximum page size. */
  MAX_PAGE_SIZE: 200,

  /** Content‑hash deduplication lookback window (days). */
  DEDUP_LOOKBACK_DAYS: 365,

  /** Soft‑delete retention (days) before hard purge. */
  RETENTION_DAYS: 30,
} as const;

/* ====================================================================== *
 *  MIME‑type allow lists                                                  *
 * ====================================================================== */

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
] as const;

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
] as const;

export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
  'audio/flac',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
] as const;

/** Combined default allow list of all MIME types. */
export const ALL_ALLOWED_MIME_TYPES: readonly string[] = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

/* ====================================================================== *
 *  Variant presets                                                       *
 * ====================================================================== */

/**
 * Default image‑variant configurations.
 * Matches the presets from the source `image-optimization.service.ts`.
 */
export const VARIANT_PRESETS_CONFIG: Record<VariantPreset, VariantPresetConfig> = {
  thumb:  { width: 150,  height: 150,  quality: 70, fit: 'cover'   },
  small:  { width: 400,  height: 300,  quality: 75, fit: 'inside'  },
  medium: { width: 800,  height: 600,  quality: 80, fit: 'inside'  },
  large:  { width: 1200, height: 900,  quality: 85, fit: 'inside'  },
  og:     { width: 1200, height: 630,  quality: 85, fit: 'cover'   },
  full:   { width: 1920, height: 1080, quality: 85, fit: 'inside'  },
} as const;

/** OG‑image recommended dimensions. */
export const OG_IMAGE_WIDTH  = 1200;
export const OG_IMAGE_HEIGHT = 630;

/* ====================================================================== *
 *  Cache configuration                                                   *
 * ====================================================================== */

/** Cache TTLs in seconds. */
export const CACHE_TTL = {
  MEDIA_ITEM:   3600,    // 1 hour
  FOLDER_LIST:  7200,    // 2 hours
  SEARCH:       300,     // 5 minutes
  STATS:        600,     // 10 minutes
  ADMIN_SETTINGS: 3600,  // 1 hour
} as const;

/** Cache key generators. */
export const CACHE_KEYS = {
  mediaById:     (id: string)     => `media:item:id:${id}`,
  mediaByHash:   (hash: string)   => `media:item:hash:${hash}`,
  mediaByFolder: (folder: string) => `media:list:folder:${folder}`,
  folderList:    ()               => 'media:folders:all',
  mediaCount:    ()               => 'media:count:total',
  mediaSearch:   (q: string)      => `media:search:${q}`,
  mediaStats:    ()               => 'media:stats',
  adminSettings: ()               => 'media:admin:settings',
  folderStats:   ()               => 'media:folders:stats',
} as const;

/* ====================================================================== *
 *  Module defaults                                                       *
 * ====================================================================== */

/** Full default configuration for the media manager service. */
export const MEDIA_DEFAULTS: MediaConfig = {
  maxUploadSize:        MEDIA_LIMITS.MAX_FILE_SIZE,
  maxBulkItems:         MEDIA_LIMITS.MAX_BULK_ITEMS,
  allowedMimeTypes:     ALL_ALLOWED_MIME_TYPES as unknown as string[],
  enableOptimization:   true,
  enableWebPConversion: true,
  enableAvifConversion: false,
  variantPresets:       VARIANT_PRESETS_CONFIG,
  defaultFolder:        'uploads',
  cdnPrefix:            '',
  storageProvider:      'local',
  hashAlgorithm:        'sha256',
  retentionDays:        MEDIA_LIMITS.RETENTION_DAYS,
  enableDeduplication:  true,
  enableSoftDelete:     true,
};

/** Default resolved frontend settings. */
export const FRONTEND_DEFAULTS: ResolvedMediaAdminSettings = {
  maxUploadSize:       MEDIA_LIMITS.MAX_FILE_SIZE,
  allowedMimeTypes:    ALL_ALLOWED_MIME_TYPES as unknown as string[],
  enableOptimization:  true,
  enableDragDrop:      true,
  enablePasteUpload:   true,
  enableUrlUpload:     true,
  enableBulkOperations: true,
  enableFolders:       true,
  enableSearch:        true,
  enableFilters:       true,
  enableSeoAudit:      false,
  defaultView:         'grid',
  gridColumns:         4,
  pageSize:            MEDIA_LIMITS.DEFAULT_PAGE_SIZE,
};

/* ====================================================================== *
 *  SEO‑related constants (cross‑module alignment)                        *
 * ====================================================================== */

/**
 * Maximum alt‑text length — mirrors `IMAGE_ALT_MAX_LENGTH` from
 * `seo/constants.ts` so Media Manager audits are consistent.
 */
export const IMAGE_ALT_MAX_LENGTH  = 125;
export const IMAGE_TITLE_MAX_LENGTH = 100;

/** Minimum recommended image dimensions for OG compliance. */
export const OG_MIN_WIDTH  = 1200;
export const OG_MIN_HEIGHT = 630;

/** File‑size thresholds for SEO audit warnings (bytes). */
export const IMAGE_SIZE_WARN_THRESHOLD  = 200 * 1024;    // 200 KB
export const IMAGE_SIZE_ERROR_THRESHOLD = 1 * 1024 * 1024; // 1 MB

/** Preferred web formats (SEO audit recommends these). */
export const PREFERRED_WEB_FORMATS = ['webp', 'avif'] as const;

/* ====================================================================== *
 *  Pure helper functions                                                 *
 * ====================================================================== */

/**
 * Classify a MIME type into a high‑level `MediaType` category.
 *
 * ```ts
 * getMimeCategory('image/jpeg');       // → 'IMAGE'
 * getMimeCategory('application/pdf');  // → 'DOCUMENT'
 * getMimeCategory('font/woff2');       // → 'OTHER'
 * ```
 */
export function getMimeCategory(mimeType: string): MediaType {
  const lower = mimeType.toLowerCase();
  if (lower.startsWith('image/'))       return 'IMAGE';
  if (lower.startsWith('video/'))       return 'VIDEO';
  if (lower.startsWith('audio/'))       return 'AUDIO';
  if (
    lower.startsWith('application/') ||
    lower.startsWith('text/')
  ) {
    return 'DOCUMENT';
  }
  return 'OTHER';
}

/** Shortcut: is this MIME type an image? */
export function isImageMime(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('image/');
}

/** Shortcut: is this MIME type a video? */
export function isVideoMime(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('video/');
}

/** Shortcut: is this MIME type audio? */
export function isAudioMime(mimeType: string): boolean {
  return mimeType.toLowerCase().startsWith('audio/');
}

/**
 * Generate a unique filename for storage.
 * Format: `{uuid}-{timestamp}.{ext}`
 *
 * Uses `crypto.randomUUID()` when available, otherwise falls back
 * to a simple pseudo‑random hex string.
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
  return ext ? `${uuid}-${timestamp}.${ext}` : `${uuid}-${timestamp}`;
}

/**
 * Extract the lowercased file extension from a filename.
 *
 * ```ts
 * getFileExtension('photo.JPG');  // → 'jpg'
 * getFileExtension('README');     // → ''
 * ```
 */
export function getFileExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return '';
  return filename.slice(idx + 1).toLowerCase();
}

/**
 * Sanitise a filename for safe storage:
 * - Lowercase
 * - Strip non‑alphanumeric characters (keep `-`, `_`, `.`)
 * - Collapse consecutive separators
 * - Trim leading / trailing separators
 * - Truncate to `MEDIA_LIMITS.MAX_FILENAME_LENGTH`
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')           // strip diacritics
    .replace(/[^a-z0-9._-]/g, '-')             // non‑safe chars → dash
    .replace(/[-_]{2,}/g, '-')                  // collapse separators
    .replace(/^[-_.]+|[-_.]+$/g, '')            // trim edges
    .slice(0, MEDIA_LIMITS.MAX_FILENAME_LENGTH);
}

/**
 * Pretty‑print bytes as a human‑readable string.
 *
 * ```ts
 * formatFileSize(1536);      // → '1.50 KB'
 * formatFileSize(1048576);   // → '1.00 MB'
 * ```
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(2)} ${units[i]}`;
}

/**
 * Derive a slug from a filename (no extension).
 *
 * ```ts
 * filenameToSlug('My Photo (Final).jpg'); // → 'my-photo-final'
 * ```
 */
export function filenameToSlug(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  return sanitizeFilename(nameWithoutExt);
}

/**
 * Check whether a MIME type is in the allowed list.
 */
export function isMimeTypeAllowed(
  mimeType: string,
  allowedTypes: readonly string[] = ALL_ALLOWED_MIME_TYPES,
): boolean {
  return allowedTypes.includes(mimeType.toLowerCase());
}

/**
 * Get the appropriate icon name (Lucide icon) for a MIME category.
 */
export function getMediaTypeIcon(type: MediaType): string {
  switch (type) {
    case 'IMAGE':    return 'Image';
    case 'VIDEO':    return 'Film';
    case 'AUDIO':    return 'Music';
    case 'DOCUMENT': return 'FileText';
    default:         return 'File';
  }
}

/**
 * Return a human‑readable label for a MIME type.
 *
 * ```ts
 * getMimeLabel('image/jpeg');   // → 'JPEG Image'
 * getMimeLabel('application/pdf'); // → 'PDF Document'
 * ```
 */
export function getMimeLabel(mimeType: string): string {
  const LABELS: Record<string, string> = {
    'image/jpeg':        'JPEG Image',
    'image/png':         'PNG Image',
    'image/gif':         'GIF Image',
    'image/webp':        'WebP Image',
    'image/avif':        'AVIF Image',
    'image/svg+xml':     'SVG Image',
    'image/bmp':         'BMP Image',
    'image/tiff':        'TIFF Image',
    'video/mp4':         'MP4 Video',
    'video/webm':        'WebM Video',
    'video/ogg':         'OGG Video',
    'video/quicktime':   'QuickTime Video',
    'audio/mpeg':        'MP3 Audio',
    'audio/ogg':         'OGG Audio',
    'audio/wav':         'WAV Audio',
    'audio/webm':        'WebM Audio',
    'audio/flac':        'FLAC Audio',
    'application/pdf':   'PDF Document',
    'text/plain':        'Text File',
    'text/csv':          'CSV File',
    'application/json':  'JSON File',
    'application/zip':   'ZIP Archive',
  };
  return LABELS[mimeType.toLowerCase()] || mimeType;
}

/* ====================================================================== *
 *  Magic bytes (file signature) detection                                *
 * ====================================================================== */

/**
 * File signature patterns for magic‑byte detection.
 * Each entry maps a byte prefix (as hex) to its corresponding MIME type.
 */
const MAGIC_BYTES: Array<{ bytes: number[]; mime: string; offset?: number }> = [
  // Images
  { bytes: [0xFF, 0xD8, 0xFF],                             mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38],                       mime: 'image/gif' },
  { bytes: [0x52, 0x49, 0x46, 0x46],                       mime: 'image/webp' },  // RIFF....WEBP (checked further below)
  { bytes: [0x42, 0x4D],                                   mime: 'image/bmp' },
  { bytes: [0x49, 0x49, 0x2A, 0x00],                       mime: 'image/tiff' },
  { bytes: [0x4D, 0x4D, 0x00, 0x2A],                       mime: 'image/tiff' },
  // Video
  { bytes: [0x1A, 0x45, 0xDF, 0xA3],                       mime: 'video/webm' },
  { bytes: [0x00, 0x00, 0x00],                              mime: 'video/mp4' },   // ftyp box (checked further)
  // Audio
  { bytes: [0x49, 0x44, 0x33],                              mime: 'audio/mpeg' },  // ID3
  { bytes: [0xFF, 0xFB],                                   mime: 'audio/mpeg' },  // MP3 sync
  { bytes: [0xFF, 0xF3],                                   mime: 'audio/mpeg' },
  { bytes: [0xFF, 0xF2],                                   mime: 'audio/mpeg' },
  { bytes: [0x4F, 0x67, 0x67, 0x53],                       mime: 'audio/ogg' },
  { bytes: [0x66, 0x4C, 0x61, 0x43],                       mime: 'audio/flac' },
  // Documents
  { bytes: [0x25, 0x50, 0x44, 0x46],                       mime: 'application/pdf' },
  { bytes: [0x50, 0x4B, 0x03, 0x04],                       mime: 'application/zip' },
  { bytes: [0x1F, 0x8B],                                   mime: 'application/gzip' },
];

/**
 * Detect MIME type from file magic bytes (file signature).
 * Returns `null` if the format is unrecognised (e.g. plain text files).
 *
 * This is NOT a comprehensive detector — it covers the most common
 * formats in the allow list for an early sanity check.
 */
export function detectMimeFromMagicBytes(buffer: Buffer | Uint8Array): string | null {
  if (buffer.byteLength < 12) return null;

  // Check RIFF containers (WebP vs AVI)
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    const tag = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
    if (tag === 'WEBP') return 'image/webp';
    if (tag === 'AVI ') return 'video/x-msvideo';
    if (tag === 'WAVE') return 'audio/wav';
    return null;
  }

  // Check MP4 / QuickTime (ftyp box)
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00) {
    const ftyp = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    if (ftyp === 'ftyp') return 'video/mp4';
  }

  // AVIF also uses ftyp with specific brand
  if (buffer.byteLength >= 12) {
    const ftyp = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    if (ftyp === 'ftyp') {
      const brand = String.fromCharCode(buffer[8], buffer[9], buffer[10], buffer[11]);
      if (brand === 'avif' || brand === 'avis') return 'image/avif';
    }
  }

  // SVG detection (text-based)
  const head = Buffer.from(buffer.slice(0, 256)).toString('utf8').trim();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) return 'image/svg+xml';

  // Check remaining patterns
  for (const sig of MAGIC_BYTES) {
    const offset = sig.offset ?? 0;
    if (buffer.byteLength < offset + sig.bytes.length) continue;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (buffer[offset + i] !== sig.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return sig.mime;
  }

  return null;
}
