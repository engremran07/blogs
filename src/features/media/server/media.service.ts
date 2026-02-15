// media-manager/media.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Core Media Manager service — framework‑agnostic, pure TypeScript.
// All infrastructure dependencies (Prisma, storage, cache, image processor)
// are injected via the constructor.
//
// Pattern: same DI‑bag constructor used by `blog.service.ts`, with
// optional deps that degrade gracefully (noop logger, no cache, no
// image optimisation when processor is absent).
// ─────────────────────────────────────────────────────────────────────────────

import 'server-only';

import {
  MEDIA_DEFAULTS,
  CACHE_KEYS,
  CACHE_TTL,
  MEDIA_LIMITS,
  VARIANT_PRESETS_CONFIG,
  IMAGE_ALT_MAX_LENGTH,
  IMAGE_SIZE_WARN_THRESHOLD,
  IMAGE_SIZE_ERROR_THRESHOLD,
  OG_MIN_WIDTH,
  OG_MIN_HEIGHT,
  PREFERRED_WEB_FORMATS,
  isImageMime,
  getMimeCategory,
  generateUniqueFilename,
  getFileExtension,
  detectMimeFromMagicBytes,
} from './constants';

import {
  sanitizeFilename,
  sanitizeFolderName,
  sanitizeMediaInput,
  validateUploadUrl,
  isPrivateUrl,
} from './sanitization.util';

import type {
  MediaConfig,
  MediaItem,
  MediaFolder,
  MediaServiceDeps,
  MediaPrismaClient,
  StorageProvider,
  MediaCacheProvider,
  MediaLogger,
  ImageProcessor,
  RevalidationCallback,
  UploadMediaInput,
  UploadFromUrlInput,
  UpdateMediaInput,
  BulkMoveInput,
  BulkDeleteInput,
  BulkTagInput,
  MediaFilter,
  MediaSort,
  PaginatedResult,
  MediaSeoData,
  MediaSeoAuditResult,
  SitemapImageData,
  MediaVariantMapWithWebP,
  ApiResponse,
  TagMode,
} from '../types';
import { MediaError } from '../types';

/* ====================================================================== *
 *  No‑op fallbacks                                                       *
 * ====================================================================== */

const noopLogger: MediaLogger = {
  info:  () => {},
  warn:  () => {},
  error: () => {},
  debug: () => {},
};

/* ====================================================================== *
 *  Helper: ApiResponse builders (same pattern as seo.service.ts)         *
 * ====================================================================== */

function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { success: true, data, meta };
}

function fail<T>(code: string, message: string, details?: Record<string, unknown>): ApiResponse<T> {
  return { success: false, data: null, error: { code, message, details } };
}

/* ====================================================================== *
 *  MediaService                                                          *
 * ====================================================================== */

export class MediaService {
  private readonly prisma: MediaPrismaClient;
  private readonly storage: StorageProvider;
  private readonly cache: MediaCacheProvider | null;
  private readonly log: MediaLogger;
  private readonly imageProcessor: ImageProcessor | null;
  private readonly _getConfig?: () => Promise<MediaConfig> | MediaConfig;
  private readonly revalidate: RevalidationCallback | null;

  constructor(deps: MediaServiceDeps) {
    this.prisma         = deps.prisma;
    this.storage        = deps.storage;
    this.cache          = deps.cache ?? null;
    this.log            = deps.logger ?? noopLogger;
    this.imageProcessor = deps.imageProcessor ?? null;
    this._getConfig     = deps.getConfig;
    this.revalidate     = deps.revalidate ?? null;
  }

  /* ================================================================== *
   *  Config                                                             *
   * ================================================================== */

  private async getConfig(): Promise<Required<MediaConfig>> {
    const custom = this._getConfig ? await this._getConfig() : {};
    return { ...MEDIA_DEFAULTS, ...custom } as Required<MediaConfig>;
  }

  /* ================================================================== *
   *  UPLOAD — single file                                               *
   * ================================================================== */

  async uploadFile(
    input: UploadMediaInput,
    userId?: string,
  ): Promise<ApiResponse<MediaItem>> {
    const cfg = await this.getConfig();

    // --- Validate size ---
    if (input.size > cfg.maxUploadSize) {
      return fail('FILE_TOO_LARGE', `File exceeds maximum size of ${cfg.maxUploadSize} bytes`);
    }

    // --- Validate MIME ---
    if (
      cfg.allowedMimeTypes.length > 0 &&
      !cfg.allowedMimeTypes.includes(input.mimeType.toLowerCase())
    ) {
      return fail('UNSUPPORTED_TYPE', `MIME type ${input.mimeType} is not allowed`);
    }

    const buffer = Buffer.from(input.buffer as ArrayBuffer);

    // --- Validate magic bytes (file signature) ---
    const detectedMime = detectMimeFromMagicBytes(buffer);
    if (detectedMime) {
      // If we can detect the real type, ensure it matches the claimed type
      const claimedCategory = getMimeCategory(input.mimeType);
      const detectedCategory = getMimeCategory(detectedMime);
      if (claimedCategory !== detectedCategory) {
        this.log.warn('MIME type mismatch detected', {
          claimed: input.mimeType,
          detected: detectedMime,
        });
        return fail(
          'MIME_MISMATCH',
          `File content does not match declared MIME type (claimed: ${input.mimeType}, detected: ${detectedMime})`,
        );
      }
    }

    // --- Deduplication ---
    let contentHash: string | null = null;
    if (cfg.enableDeduplication && this.imageProcessor) {
      try {
        contentHash = await this.imageProcessor.computeHash(buffer, cfg.hashAlgorithm);

        const existing = await this.prisma.media.findFirst({
          where: {
            contentHash,
            deletedAt: null,
          },
        });

        if (existing) {
          this.log.info('Duplicate file detected', { hash: contentHash, existingId: existing.id });
          return ok(existing, { deduplicated: true });
        }
      } catch (err) {
        this.log.warn('Hash computation failed, skipping dedup', { error: String(err) });
      }
    }

    // --- Sanitise filename & prepare path ---
    const safeName    = sanitizeFilename(input.originalName);
    const uniqueName  = generateUniqueFilename(safeName);
    const folder      = input.folder ? sanitizeFolderName(input.folder) : cfg.defaultFolder;
    const storagePath = `${folder}/${uniqueName}`;

    // --- Extract image metadata ---
    let width:  number | null = null;
    let height: number | null = null;
    const isImage = isImageMime(input.mimeType);

    if (isImage && this.imageProcessor) {
      try {
        const meta = await this.imageProcessor.getMetadata(buffer);
        width  = meta.width;
        height = meta.height;
      } catch (err) {
        this.log.warn('Image metadata extraction failed', { error: String(err) });
      }
    }

    // --- Upload original ---
    let url: string;
    try {
      url = await this.storage.upload(buffer, storagePath, input.mimeType);
    } catch (err) {
      this.log.error('Storage upload failed', { error: String(err), path: storagePath });
      return fail('UPLOAD_FAILED', 'Failed to upload file to storage');
    }

    // --- Generate variants ---
    let variants: MediaVariantMapWithWebP | null = null;
    let isOptimized = false;

    if (isImage && cfg.enableOptimization && this.imageProcessor) {
      try {
        const { variants: v, buffers } = await this.imageProcessor.generateVariants(
          buffer,
          cfg.variantPresets,
          { webp: cfg.enableWebPConversion, avif: cfg.enableAvifConversion },
        );

        // Upload each variant buffer
        for (const [key, variantBuf] of buffers.entries()) {
          const ext       = key.includes('webp') ? 'webp' : key.includes('avif') ? 'avif' : getFileExtension(safeName);
          const varPath   = `${folder}/optimized/${uniqueName.replace(/\.[^.]+$/, '')}-${key}.${ext}`;
          const varUrl    = await this.storage.upload(variantBuf, varPath, `image/${ext}`);

          // Patch URL into the variant record
          const varKey = key as keyof MediaVariantMapWithWebP;
          if (v[varKey]) {
            v[varKey]!.url = varUrl;
          }
        }

        variants    = v;
        isOptimized = true;
      } catch (err) {
        this.log.warn('Variant generation failed, proceeding without optimisation', { error: String(err) });
      }
    }

    // --- Sanitise metadata ---
    const sanitised = sanitizeMediaInput({
      altText:     input.altText,
      title:       input.title,
      description: input.description,
      tags:        input.tags,
    });

    // --- Persist ---
    const item = await this.prisma.media.create({
      data: {
        filename:      uniqueName,
        originalName:  input.originalName,
        mimeType:      input.mimeType.toLowerCase(),
        size:          input.size,
        url,
        path:          storagePath,
        width,
        height,
        altText:       sanitised.altText ?? null,
        title:         sanitised.title ?? null,
        description:   sanitised.description ?? null,
        tags:          sanitised.tags ?? [],
        folder,
        isOptimized,
        variants:      variants as unknown as Record<string, unknown> ?? null,
        uploadedById:  userId ?? null,
        contentHash,
        hashAlgorithm: contentHash ? cfg.hashAlgorithm : null,
      },
    });

    // --- Cache & events ---
    await this.invalidateCache(item);
    this.log.info('File uploaded', { id: item.id, filename: item.originalName });

    if (this.revalidate) {
      await this.revalidate(`/media/${item.id}`);
    }

    return ok(item);
  }

  /* ================================================================== *
   *  UPLOAD — from URL                                                  *
   * ================================================================== */

  async uploadFromUrl(
    input: UploadFromUrlInput,
    userId?: string,
  ): Promise<ApiResponse<MediaItem>> {
    // --- SSRF check ---
    try {
      validateUploadUrl(input);
    } catch (err) {
      return fail('INVALID_URL', (err as Error).message);
    }

    // --- Fetch remote file ---
    let response: Response;
    try {
      const controller = new AbortController();
      const timeout    = setTimeout(() => controller.abort(), 30_000);

      response = await fetch(input.url, {
        signal:  controller.signal,
        headers: { 'User-Agent': 'MediaManager/1.0' },
        redirect: 'follow',
      });

      clearTimeout(timeout);
    } catch (err) {
      return fail('FETCH_FAILED', `Failed to fetch URL: ${(err as Error).message}`);
    }

    if (!response.ok) {
      return fail('FETCH_FAILED', `URL returned HTTP ${response.status}`);
    }

    // --- Validate response ---
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLen  = parseInt(response.headers.get('content-length') || '0', 10);
    const cfg         = await this.getConfig();

    if (contentLen > 0 && contentLen > cfg.maxUploadSize) {
      return fail('FILE_TOO_LARGE', `Remote file exceeds maximum size of ${cfg.maxUploadSize} bytes`);
    }

    // --- Read body with streaming size enforcement ---
    const reader = response.body?.getReader();
    if (!reader) {
      return fail('FETCH_FAILED', 'Response has no readable body');
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > cfg.maxUploadSize) {
          reader.cancel();
          return fail('FILE_TOO_LARGE', `Downloaded file exceeds maximum size of ${cfg.maxUploadSize} bytes`);
        }
        chunks.push(value);
      }
    } catch (err) {
      return fail('FETCH_FAILED', `Stream read error: ${(err as Error).message}`);
    }

    const buffer = Buffer.concat(chunks);

    // --- Check for redirect to private IP ---
    if (response.url && isPrivateUrl(response.url)) {
      return fail('SSRF_BLOCKED', 'Redirected URL resolves to a private address');
    }

    // --- Derive filename ---
    const urlPath      = new URL(input.url).pathname;
    const originalName = decodeURIComponent(urlPath.split('/').pop() || 'download');
    const mimeType     = contentType.split(';')[0].trim();

    return this.uploadFile(
      {
        buffer,
        originalName,
        mimeType,
        size:        buffer.byteLength,
        folder:      input.folder,
        altText:     input.altText,
        title:       input.title,
        description: input.description,
        tags:        input.tags,
      },
      userId,
    );
  }

  /* ================================================================== *
   *  UPLOAD — bulk                                                      *
   * ================================================================== */

  async bulkUpload(
    files: UploadMediaInput[],
    userId?: string,
  ): Promise<ApiResponse<{ succeeded: MediaItem[]; failed: { filename: string; error: string }[] }>> {
    const cfg = await this.getConfig();

    if (files.length > cfg.maxBulkItems) {
      return fail('BULK_LIMIT', `Maximum ${cfg.maxBulkItems} files per bulk upload`);
    }

    const results = await Promise.allSettled(
      files.map((f) => this.uploadFile(f, userId)),
    );

    const succeeded: MediaItem[] = [];
    const failed: { filename: string; error: string }[] = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.success && r.value.data) {
        succeeded.push(r.value.data);
      } else {
        const errMsg = r.status === 'rejected'
          ? String(r.reason)
          : r.value.error?.message ?? 'Unknown error';
        failed.push({ filename: files[i].originalName, error: errMsg });
      }
    });

    return ok({ succeeded, failed });
  }

  /* ================================================================== *
   *  READ — single item                                                 *
   * ================================================================== */

  async getById(id: string): Promise<ApiResponse<MediaItem>> {
    // Cache first
    if (this.cache) {
      const cached = await this.cache.get<MediaItem>(CACHE_KEYS.mediaById(id));
      if (cached) return ok(cached);
    }

    const item = await this.prisma.media.findUnique({
      where: { id },
    });

    if (!item || item.deletedAt) {
      return fail('NOT_FOUND', 'Media item not found');
    }

    if (this.cache) {
      await this.cache.set(CACHE_KEYS.mediaById(id), item, CACHE_TTL.MEDIA_ITEM);
    }

    return ok(item);
  }

  /* ================================================================== *
   *  LIST — paginated with filters & sorting                            *
   * ================================================================== */

  async list(
    filter?: MediaFilter,
    sort?: MediaSort,
    page: number = 1,
    pageSize: number = MEDIA_LIMITS.DEFAULT_PAGE_SIZE,
  ): Promise<ApiResponse<PaginatedResult<MediaItem>>> {
    const effectivePageSize = Math.min(pageSize, MEDIA_LIMITS.MAX_PAGE_SIZE);
    const skip = (page - 1) * effectivePageSize;

    // Build WHERE clause
    const where = this.buildWhereClause(filter);

    // Build ORDER BY
    const orderBy = this.buildOrderBy(sort);

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        orderBy,
        skip,
        take: effectivePageSize,
      }),
      this.prisma.media.count({ where }),
    ]);

    const totalPages = Math.ceil(total / effectivePageSize);

    return ok({
      items,
      total,
      page,
      pageSize: effectivePageSize,
      totalPages,
      hasNext:     page < totalPages,
      hasPrevious: page > 1,
    });
  }

  /* ================================================================== *
   *  UPDATE — metadata                                                  *
   * ================================================================== */

  async update(
    id: string,
    input: UpdateMediaInput,
    userId?: string,
  ): Promise<ApiResponse<MediaItem>> {
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return fail('NOT_FOUND', 'Media item not found');
    }

    // Ownership check (non‑admin)
    if (userId && existing.uploadedById && existing.uploadedById !== userId) {
      return fail('FORBIDDEN', 'You do not have permission to update this item', { statusCode: 403 });
    }

    const sanitised = sanitizeMediaInput(input);

    const data: Record<string, unknown> = {};
    if (sanitised.altText !== undefined)     data.altText     = sanitised.altText;
    if (sanitised.title !== undefined)       data.title       = sanitised.title;
    if (sanitised.description !== undefined) data.description = sanitised.description;
    if (sanitised.tags !== undefined)        data.tags        = sanitised.tags;

    // Folder move
    if (sanitised.folder && sanitised.folder !== existing.folder) {
      const newFolder = sanitizeFolderName(sanitised.folder);
      const newPath   = `${newFolder}/${existing.filename}`;

      try {
        const newUrl  = await this.storage.move(existing.path, newPath);
        data.folder = newFolder;
        data.path   = newPath;
        data.url    = newUrl;
      } catch (err) {
        return fail('MOVE_FAILED', `Failed to move file: ${(err as Error).message}`);
      }
    }

    data.updatedAt = new Date();

    const updated = await this.prisma.media.update({
      where: { id },
      data,
    });

    await this.invalidateCache(updated);

    if (this.revalidate) {
      await this.revalidate(`/media/${id}`);
    }

    return ok(updated);
  }

  /* ================================================================== *
   *  DELETE — single                                                    *
   * ================================================================== */

  async delete(
    id: string,
    userId?: string,
  ): Promise<ApiResponse<{ id: string }>> {
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return fail('NOT_FOUND', 'Media item not found');
    }

    if (userId && existing.uploadedById && existing.uploadedById !== userId) {
      return fail('FORBIDDEN', 'You do not have permission to delete this item', { statusCode: 403 });
    }

    const cfg = await this.getConfig();

    if (cfg.enableSoftDelete) {
      await this.prisma.media.update({
        where: { id },
        data:  { deletedAt: new Date() },
      });
    } else {
      // Hard delete — remove from storage
      await this.deleteFromStorage(existing);
      await this.prisma.media.delete({ where: { id } });
    }

    await this.invalidateCache(existing);
    this.log.info('Media deleted', { id, soft: cfg.enableSoftDelete });

    if (this.revalidate) {
      await this.revalidate(`/media/${id}`);
    }

    return ok({ id });
  }

  /* ================================================================== *
   *  BULK DELETE                                                        *
   * ================================================================== */

  async bulkDelete(
    input: BulkDeleteInput,
    userId?: string,
  ): Promise<ApiResponse<{ deleted: string[]; failed: { id: string; error: string }[] }>> {
    const cfg = await this.getConfig();

    if (input.ids.length > cfg.maxBulkItems) {
      return fail('BULK_LIMIT', `Maximum ${cfg.maxBulkItems} items per bulk delete`);
    }

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    const results = await Promise.allSettled(
      input.ids.map((id) => this.delete(id, userId)),
    );

    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.success) {
        deleted.push(input.ids[i]);
      } else {
        const errMsg = r.status === 'rejected'
          ? String(r.reason)
          : r.value.error?.message ?? 'Unknown error';
        failed.push({ id: input.ids[i], error: errMsg });
      }
    });

    return ok({ deleted, failed });
  }

  /* ================================================================== *
   *  BULK MOVE                                                          *
   * ================================================================== */

  async bulkMove(
    input: BulkMoveInput,
    userId?: string,
  ): Promise<ApiResponse<{ moved: string[]; failed: { id: string; error: string }[] }>> {
    const cfg = await this.getConfig();

    if (input.ids.length > cfg.maxBulkItems) {
      return fail('BULK_LIMIT', `Maximum ${cfg.maxBulkItems} items per bulk move`);
    }

    const targetFolder = sanitizeFolderName(input.targetFolder);
    const moved: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of input.ids) {
      try {
        const result = await this.update(id, { folder: targetFolder }, userId);
        if (result.success) {
          moved.push(id);
        } else {
          failed.push({ id, error: result.error?.message ?? 'Update failed' });
        }
      } catch (err) {
        failed.push({ id, error: String(err) });
      }
    }

    return ok({ moved, failed });
  }

  /* ================================================================== *
   *  BULK TAG                                                           *
   * ================================================================== */

  async bulkUpdateTags(
    input: BulkTagInput,
    userId?: string,
  ): Promise<ApiResponse<{ updated: string[]; failed: { id: string; error: string }[] }>> {
    const cfg = await this.getConfig();

    if (input.ids.length > cfg.maxBulkItems) {
      return fail('BULK_LIMIT', `Maximum ${cfg.maxBulkItems} items per bulk tag`);
    }

    const updated: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of input.ids) {
      try {
        const existing = await this.prisma.media.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) {
          failed.push({ id, error: 'Not found' });
          continue;
        }

        if (userId && existing.uploadedById && existing.uploadedById !== userId) {
          failed.push({ id, error: 'Forbidden' });
          continue;
        }

        let newTags: string[];
        const currentTags = existing.tags ?? [];

        switch (input.mode) {
          case 'add':
            newTags = [...new Set([...currentTags, ...input.tags])];
            break;
          case 'remove':
            newTags = currentTags.filter((t) => !input.tags.includes(t));
            break;
          case 'replace':
          default:
            newTags = [...input.tags];
            break;
        }

        newTags = newTags.slice(0, MEDIA_LIMITS.MAX_TAGS);

        await this.prisma.media.update({
          where: { id },
          data: { tags: newTags, updatedAt: new Date() },
        });

        updated.push(id);
        await this.invalidateCacheById(id);
      } catch (err) {
        failed.push({ id, error: String(err) });
      }
    }

    return ok({ updated, failed });
  }

  /* ================================================================== *
   *  BULK COPY URLS                                                     *
   * ================================================================== */

  async bulkCopyUrls(ids: string[]): Promise<ApiResponse<string[]>> {
    const items = await this.prisma.media.findMany({
      where: { id: { in: ids } as unknown as Record<string, unknown>, deletedAt: null } as Record<string, unknown>,
    });

    const urls = items.map((item) => item.url);
    return ok(urls);
  }

  /* ================================================================== *
   *  FOLDERS                                                            *
   * ================================================================== */

  async listFolders(): Promise<ApiResponse<MediaFolder[]>> {
    if (this.cache) {
      const cached = await this.cache.get<MediaFolder[]>(CACHE_KEYS.folderList());
      if (cached) return ok(cached);
    }

    const folders = await this.prisma.mediaFolder.findMany({
      orderBy: { name: 'asc' } as Record<string, unknown>,
    });

    if (this.cache) {
      await this.cache.set(CACHE_KEYS.folderList(), folders, CACHE_TTL.FOLDER_LIST);
    }

    return ok(folders);
  }

  async createFolder(
    name: string,
    parentId?: string,
    userId?: string,
  ): Promise<ApiResponse<MediaFolder>> {
    const safeName = sanitizeFolderName(name);

    // Check for duplicate folder name under same parent
    const existingFolders = await this.prisma.mediaFolder.findMany({
      where: { parentId: parentId ?? null } as unknown as Record<string, unknown>,
    });
    const duplicate = existingFolders.find(
      (f) => f.name.toLowerCase() === safeName.toLowerCase(),
    );
    if (duplicate) {
      return fail('DUPLICATE_FOLDER', `A folder named "${safeName}" already exists in this location`);
    }

    // Check depth
    if (parentId) {
      const parent = await this.prisma.mediaFolder.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        return fail('NOT_FOUND', 'Parent folder not found');
      }
      const depth = parent.path.split('/').length;
      if (depth >= MEDIA_LIMITS.MAX_FOLDER_DEPTH) {
        return fail('DEPTH_LIMIT', `Maximum folder depth of ${MEDIA_LIMITS.MAX_FOLDER_DEPTH} reached`);
      }
    }

    const folderPath = parentId
      ? await this.buildFolderPath(parentId, safeName)
      : safeName;

    const folder = await this.prisma.mediaFolder.create({
      data: {
        name:     safeName,
        parentId: parentId ?? null,
        path:     folderPath,
      },
    });

    await this.invalidateFolderCache();
    this.log.info('Folder created', { id: folder.id, name: safeName });

    return ok(folder);
  }

  async renameFolder(
    id: string,
    newName: string,
  ): Promise<ApiResponse<MediaFolder>> {
    const safeName = sanitizeFolderName(newName);

    const existing = await this.prisma.mediaFolder.findUnique({ where: { id } });
    if (!existing) {
      return fail('NOT_FOUND', 'Folder not found');
    }

    // Check for duplicate name under same parent
    const siblings = await this.prisma.mediaFolder.findMany({
      where: { parentId: existing.parentId ?? null } as unknown as Record<string, unknown>,
    });
    const duplicate = siblings.find(
      (f) => f.id !== id && f.name.toLowerCase() === safeName.toLowerCase(),
    );
    if (duplicate) {
      return fail('DUPLICATE_FOLDER', `A folder named "${safeName}" already exists in this location`);
    }

    const oldPath = existing.path;
    const newPath = existing.parentId
      ? await this.buildFolderPath(existing.parentId, safeName)
      : safeName;

    // Update all media items in this folder
    await this.prisma.media.updateMany({
      where: { folder: oldPath },
      data:  { folder: newPath },
    });

    const updated = await this.prisma.mediaFolder.update({
      where: { id },
      data:  { name: safeName, path: newPath },
    });

    await this.invalidateFolderCache();
    this.log.info('Folder renamed', { id, from: oldPath, to: newPath });

    return ok(updated);
  }

  async deleteFolder(
    id: string,
    mode: 'move-to-root' | 'delete-contents' = 'move-to-root',
  ): Promise<ApiResponse<{ id: string }>> {
    const folder = await this.prisma.mediaFolder.findUnique({ where: { id } });
    if (!folder) {
      return fail('NOT_FOUND', 'Folder not found');
    }

    if (mode === 'move-to-root') {
      // Move all items to root folder
      const cfg = await this.getConfig();
      await this.prisma.media.updateMany({
        where: { folder: folder.path },
        data:  { folder: cfg.defaultFolder },
      });
    } else {
      // Delete all items in this folder
      const items = await this.prisma.media.findMany({
        where: { folder: folder.path },
      });
      for (const item of items) {
        await this.deleteFromStorage(item);
      }
      await this.prisma.media.updateMany({
        where: { folder: folder.path },
        data:  { deletedAt: new Date() },
      });
    }

    await this.prisma.mediaFolder.delete({ where: { id } });
    await this.invalidateFolderCache();
    this.log.info('Folder deleted', { id, name: folder.name, mode });

    return ok({ id });
  }

  async getFolderStats(): Promise<ApiResponse<Record<string, { count: number; totalSize: number }>>> {
    if (this.cache) {
      const cached = await this.cache.get<Record<string, { count: number; totalSize: number }>>(
        CACHE_KEYS.folderStats(),
      );
      if (cached) return ok(cached);
    }

    const groups = await this.prisma.media.groupBy({
      by: ['folder'],
      _count: { id: true },
      _sum:   { size: true },
      where:  { deletedAt: null },
    });

    const stats: Record<string, { count: number; totalSize: number }> = {};
    for (const g of groups) {
      const folder = (g as Record<string, unknown>).folder as string;
      const count  = ((g as Record<string, unknown>)._count as Record<string, number>)?.id ?? 0;
      const size   = ((g as Record<string, unknown>)._sum as Record<string, number>)?.size ?? 0;
      stats[folder] = { count, totalSize: size };
    }

    if (this.cache) {
      await this.cache.set(CACHE_KEYS.folderStats(), stats, CACHE_TTL.STATS);
    }

    return ok(stats);
  }

  /* ================================================================== *
   *  SEARCH                                                             *
   * ================================================================== */

  async search(
    query: string,
    filter?: MediaFilter,
    sort?: MediaSort,
    page = 1,
    pageSize = MEDIA_LIMITS.DEFAULT_PAGE_SIZE,
  ): Promise<ApiResponse<PaginatedResult<MediaItem>>> {
    const searchFilter: MediaFilter = {
      ...filter,
      search: query,
    };
    return this.list(searchFilter, sort, page, pageSize);
  }

  /* ================================================================== *
   *  DUPLICATE DETECTION                                                *
   * ================================================================== */

  async findDuplicates(): Promise<ApiResponse<Map<string, MediaItem[]>>> {
    const groups = await this.prisma.media.groupBy({
      by: ['contentHash'],
      _count: { id: true },
      where: {
        contentHash: { not: null } as unknown as Record<string, unknown>,
        deletedAt: null,
      },
    });

    const duplicateHashes = groups
      .filter((g) => {
        const count = ((g as Record<string, unknown>)._count as Record<string, number>)?.id ?? 0;
        return count > 1;
      })
      .map((g) => (g as Record<string, unknown>).contentHash as string);

    if (duplicateHashes.length === 0) {
      return ok(new Map());
    }

    const items = await this.prisma.media.findMany({
      where: {
        contentHash: { in: duplicateHashes } as unknown as Record<string, unknown>,
        deletedAt: null,
      } as Record<string, unknown>,
    });

    const grouped = new Map<string, MediaItem[]>();
    for (const item of items) {
      if (!item.contentHash) continue;
      const group = grouped.get(item.contentHash) ?? [];
      group.push(item);
      grouped.set(item.contentHash, group);
    }

    return ok(grouped);
  }

  /* ================================================================== *
   *  OPTIMISATION                                                       *
   * ================================================================== */

  async optimizeMedia(id: string): Promise<ApiResponse<MediaItem>> {
    if (!this.imageProcessor) {
      return fail('NO_PROCESSOR', 'Image processor not configured');
    }

    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return fail('NOT_FOUND', 'Media item not found');
    }

    if (!isImageMime(existing.mimeType)) {
      return fail('NOT_IMAGE', 'Only image files can be optimised');
    }

    // Fetch original from storage
    const stream = await this.storage.getStream(existing.path);
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    const cfg = await this.getConfig();

    const { variants, buffers } = await this.imageProcessor.generateVariants(
      buffer,
      cfg.variantPresets,
      { webp: cfg.enableWebPConversion, avif: cfg.enableAvifConversion },
    );

    // Upload variants
    for (const [key, variantBuf] of buffers.entries()) {
      const ext     = key.includes('webp') ? 'webp' : key.includes('avif') ? 'avif' : getFileExtension(existing.filename);
      const varPath = `${existing.folder}/optimized/${existing.filename.replace(/\.[^.]+$/, '')}-${key}.${ext}`;
      const varUrl  = await this.storage.upload(variantBuf, varPath, `image/${ext}`);

      const varKey = key as keyof MediaVariantMapWithWebP;
      if (variants[varKey]) {
        variants[varKey]!.url = varUrl;
      }
    }

    const updated = await this.prisma.media.update({
      where: { id },
      data: {
        isOptimized: true,
        variants:    variants as unknown as Record<string, unknown>,
        updatedAt:   new Date(),
      },
    });

    await this.invalidateCache(updated);
    this.log.info('Media optimised', { id });

    return ok(updated);
  }

  async bulkOptimize(
    filter?: MediaFilter,
  ): Promise<ApiResponse<{ optimized: string[]; failed: { id: string; error: string }[] }>> {
    const where = this.buildWhereClause({
      ...filter,
      isOptimized: false,
    });

    // Only images
    (where as Record<string, unknown>).mimeType = { startsWith: 'image/' };

    const items = await this.prisma.media.findMany({
      where,
      take: MEDIA_LIMITS.MAX_BULK_ITEMS,
    });

    const optimized: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const item of items) {
      const result = await this.optimizeMedia(item.id);
      if (result.success) {
        optimized.push(item.id);
      } else {
        failed.push({ id: item.id, error: result.error?.message ?? 'Optimisation failed' });
      }
    }

    return ok({ optimized, failed });
  }

  async regenerateVariants(id: string): Promise<ApiResponse<MediaItem>> {
    // Delete existing variants from storage first
    const existing = await this.prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return fail('NOT_FOUND', 'Media item not found');
    }

    if (existing.variants) {
      const variantMap = existing.variants as unknown as MediaVariantMapWithWebP;
      for (const [, v] of Object.entries(variantMap)) {
        if (v?.url) {
          try {
            const varPath = v.url.replace(/^\/+/, '');
            await this.storage.delete(varPath);
          } catch {
            // Best‑effort cleanup
          }
        }
      }
    }

    // Clear variants and re‑optimise
    await this.prisma.media.update({
      where: { id },
      data: { isOptimized: false, variants: null },
    });

    return this.optimizeMedia(id);
  }

  /* ================================================================== *
   *  SEO INTEGRATION                                                    *
   * ================================================================== */

  /**
   * Get SEO‑ready data for a media item.
   * Output plugs directly into the seo module's `assembleSeoMeta()`,
   * `buildPostEntries()`, and JSON‑LD generators.
   */
  getMediaSeoData(item: MediaItem): MediaSeoData {
    const variants = item.variants as MediaVariantMapWithWebP | null;

    // Find OG variant (1200×630)
    const ogVariant = variants?.og ?? variants?.og_webp ?? null;
    const ogUrl     = ogVariant?.url ?? item.url;
    const ogWidth   = ogVariant?.width ?? item.width;
    const ogHeight  = ogVariant?.height ?? item.height;

    // SrcSet
    let srcSet: string | null = null;
    if (variants && this.imageProcessor) {
      srcSet = this.imageProcessor.generateSrcSet(variants);
    }

    // Sitemap image
    const sitemapImage: SitemapImageData | null = item.url
      ? {
          loc:     item.url,
          caption: item.description ?? undefined,
          title:   item.title ?? item.originalName,
        }
      : null;

    return {
      altText:       item.altText,
      title:         item.title,
      url:           item.url,
      width:         item.width,
      height:        item.height,
      ogImageUrl:    ogUrl,
      ogImageWidth:  ogWidth,
      ogImageHeight: ogHeight,
      srcSet,
      sitemapImage,
    };
  }

  /**
   * Audit a media item's SEO fitness.
   * Produces suggestions aligned with the seo module's
   * `checkImagesAndAltText()` checks, plus additional format/size checks.
   */
  auditMediaSeo(item: MediaItem): MediaSeoAuditResult {
    const suggestions: string[] = [];
    const variants = item.variants as MediaVariantMapWithWebP | null;

    // Alt text
    const hasAltText     = !!item.altText && item.altText.trim().length > 0;
    const altTextLength  = item.altText?.length ?? 0;

    if (!hasAltText) {
      suggestions.push('Add descriptive alt text for accessibility and SEO');
    } else if (altTextLength > IMAGE_ALT_MAX_LENGTH) {
      suggestions.push(`Alt text is too long (${altTextLength}/${IMAGE_ALT_MAX_LENGTH} chars) — consider shortening`);
    }

    // Optimisation
    const isOptimized = item.isOptimized;
    if (!isOptimized && isImageMime(item.mimeType)) {
      suggestions.push('Generate optimised variants (WebP/AVIF) for faster loading');
    }

    // WebP variant
    const hasWebPVariant = !!variants && Object.keys(variants).some((k) => k.includes('webp'));
    if (!hasWebPVariant && isImageMime(item.mimeType)) {
      suggestions.push('Generate WebP variant for better compression');
    }

    // AVIF variant
    const hasAvifVariant = !!variants && Object.keys(variants).some((k) => k.includes('avif'));

    // OG variant
    const hasOgVariant = !!variants?.og || !!variants?.og_webp;
    if (!hasOgVariant && isImageMime(item.mimeType)) {
      suggestions.push('Generate OG variant (1200×630) for social media sharing');
    }

    // OG dimensions
    const ogV = variants?.og;
    const ogDimensionsCorrect =
      ogV ? ogV.width >= OG_MIN_WIDTH && ogV.height >= OG_MIN_HEIGHT : false;
    if (hasOgVariant && !ogDimensionsCorrect) {
      suggestions.push(`OG image should be at least ${OG_MIN_WIDTH}×${OG_MIN_HEIGHT}px`);
    }

    // File size
    const fileSizeWarning = item.size > IMAGE_SIZE_WARN_THRESHOLD;
    if (item.size > IMAGE_SIZE_ERROR_THRESHOLD) {
      suggestions.push('Image file size exceeds 1MB — compress or resize for better performance');
    } else if (fileSizeWarning) {
      suggestions.push('Image file size exceeds 200KB — consider compression');
    }

    // Format
    const ext = getFileExtension(item.filename);
    const isPreferredFormat = PREFERRED_WEB_FORMATS.includes(ext as 'webp' | 'avif');
    const formatWarning     = !isPreferredFormat && isImageMime(item.mimeType);
    if (formatWarning) {
      suggestions.push(`Consider using WebP or AVIF format instead of ${ext.toUpperCase()} for better compression`);
    }

    return {
      hasAltText,
      altTextLength,
      isOptimized,
      hasWebPVariant,
      hasAvifVariant,
      hasOgVariant,
      ogDimensionsCorrect,
      fileSizeWarning,
      formatWarning,
      suggestions,
    };
  }

  /**
   * Get a `SitemapImage` for the seo module's `buildPostEntries()`.
   */
  getImageForSitemap(item: MediaItem): SitemapImageData {
    return {
      loc:     item.url,
      caption: item.description ?? undefined,
      title:   item.title ?? item.originalName,
    };
  }

  /**
   * Get a responsive srcset string from a media item's variants.
   */
  getSrcSet(item: MediaItem): string {
    if (!this.imageProcessor || !item.variants) return '';
    return this.imageProcessor.generateSrcSet(item.variants as MediaVariantMapWithWebP);
  }

  /**
   * Get the best OG image URL from a media item.
   * Fallback chain: og_webp → og → large_webp → large → original.
   */
  getOgImageUrl(item: MediaItem): string {
    const variants = item.variants as MediaVariantMapWithWebP | null;
    return (
      variants?.og_webp?.url ??
      variants?.og?.url ??
      variants?.large_webp?.url ??
      variants?.large?.url ??
      item.url
    );
  }

  /* ================================================================== *
   *  CLEANUP & MAINTENANCE                                              *
   * ================================================================== */

  async cleanupOrphaned(): Promise<ApiResponse<{ removed: number; freedBytes: number }>> {
    // Find all variant URLs referenced in the DB
    const items = await this.prisma.media.findMany({
      where: { isOptimized: true, deletedAt: null },
    });

    const referencedPaths = new Set<string>();
    for (const item of items) {
      referencedPaths.add(item.path);
      if (item.variants) {
        const varMap = item.variants as unknown as MediaVariantMapWithWebP;
        for (const v of Object.values(varMap)) {
          if (v?.url) referencedPaths.add(v.url);
        }
      }
    }

    // Collect all distinct folder paths that have optimized content
    const folderPaths = new Set<string>();
    const cfg = await this.getConfig();
    folderPaths.add(`${cfg.defaultFolder}/optimized`);

    // Also scan per-item folder optimized dirs
    for (const item of items) {
      if (item.folder) {
        folderPaths.add(`${item.folder}/optimized`);
      }
    }

    let removed = 0;
    let freedBytes = 0;

    for (const folderPath of folderPaths) {
      try {
        const files = await this.storage.listFolder(folderPath);
        for (const f of files) {
          const url = this.storage.getUrl(f);
          if (!referencedPaths.has(url) && !referencedPaths.has(f)) {
            try {
              // Attempt to get file size before deletion
              const exists = await this.storage.exists(f);
              if (exists) {
                await this.storage.delete(f);
                removed++;
              }
            } catch {
              // Best effort
            }
          }
        }
      } catch {
        // Directory may not exist — skip
      }
    }

    this.log.info('Orphan cleanup completed', { removed, freedBytes });
    return ok({ removed, freedBytes });
  }

  async purgeDeleted(olderThan?: Date): Promise<ApiResponse<{ purged: number }>> {
    const cfg     = await this.getConfig();
    const cutoff  = olderThan ?? new Date(Date.now() - cfg.retentionDays * 24 * 60 * 60 * 1000);

    const items = await this.prisma.media.findMany({
      where: {
        deletedAt: { not: null, lte: cutoff } as unknown as Record<string, unknown>,
      } as Record<string, unknown>,
    });

    let purged = 0;
    for (const item of items) {
      await this.deleteFromStorage(item);
      await this.prisma.media.delete({ where: { id: item.id } });
      purged++;
    }

    this.log.info('Purge completed', { purged, cutoff: cutoff.toISOString() });
    return ok({ purged });
  }

  /* ================================================================== *
   *  STATS                                                              *
   * ================================================================== */

  async getStats(): Promise<ApiResponse<{
    totalCount: number;
    totalSize: number;
    byType: Record<string, number>;
    byFolder: Record<string, number>;
    optimizedCount: number;
    unoptimizedCount: number;
  }>> {
    if (this.cache) {
      const cached = await this.cache.get<Record<string, unknown>>(CACHE_KEYS.mediaStats());
      if (cached) return ok(cached as never);
    }

    const [totalCount, totalSizeResult, byTypeGroups, byFolderGroups, optimizedCount] = await Promise.all([
      this.prisma.media.count({ where: { deletedAt: null } }),
      this.prisma.media.groupBy({
        by: ['id'],
        _sum: { size: true },
        where: { deletedAt: null },
      }),
      this.prisma.media.groupBy({
        by: ['mimeType'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.prisma.media.groupBy({
        by: ['folder'],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      this.prisma.media.count({
        where: { isOptimized: true, deletedAt: null },
      }),
    ]);

    const byType: Record<string, number> = {};
    for (const g of byTypeGroups) {
      const mime  = (g as Record<string, unknown>).mimeType as string;
      const count = ((g as Record<string, unknown>)._count as Record<string, number>)?.id ?? 0;
      const cat   = getMimeCategory(mime);
      byType[cat] = (byType[cat] ?? 0) + count;
    }

    const byFolder: Record<string, number> = {};
    for (const g of byFolderGroups) {
      const folder = (g as Record<string, unknown>).folder as string;
      const count  = ((g as Record<string, unknown>)._count as Record<string, number>)?.id ?? 0;
      byFolder[folder] = count;
    }

    let totalSize = 0;
    for (const r of totalSizeResult) {
      totalSize += ((r as Record<string, unknown>)._sum as Record<string, number>)?.size ?? 0;
    }

    const stats = {
      totalCount,
      totalSize,
      byType,
      byFolder,
      optimizedCount,
      unoptimizedCount: totalCount - optimizedCount,
    };

    if (this.cache) {
      await this.cache.set(CACHE_KEYS.mediaStats(), stats, CACHE_TTL.STATS);
    }

    return ok(stats);
  }

  /* ================================================================== *
   *  PRIVATE — query builders                                           *
   * ================================================================== */

  private buildWhereClause(filter?: MediaFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { deletedAt: null };

    if (!filter) return where;

    if (filter.folder)       where.folder      = filter.folder;
    if (filter.mimeType)     where.mimeType    = filter.mimeType;
    if (filter.uploadedById) where.uploadedById = filter.uploadedById;
    if (filter.isOptimized != null) where.isOptimized = filter.isOptimized;

    if (filter.mediaType) {
      const prefix = filter.mediaType.toLowerCase();
      where.mimeType = { startsWith: `${prefix}/` };
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = { hasEvery: filter.tags };
    }

    if (filter.sizeRange) {
      const sizeFilter: Record<string, unknown> = {};
      if (filter.sizeRange.min != null) sizeFilter.gte = filter.sizeRange.min;
      if (filter.sizeRange.max != null) sizeFilter.lte = filter.sizeRange.max;
      if (Object.keys(sizeFilter).length > 0) where.size = sizeFilter;
    }

    if (filter.dateRange) {
      const dateFilter: Record<string, unknown> = {};
      if (filter.dateRange.from) dateFilter.gte = new Date(filter.dateRange.from);
      if (filter.dateRange.to)   dateFilter.lte = new Date(filter.dateRange.to);
      if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
    }

    if (filter.search) {
      const term = filter.search.trim();
      where.OR = [
        { originalName: { contains: term, mode: 'insensitive' } },
        { title:        { contains: term, mode: 'insensitive' } },
        { description:  { contains: term, mode: 'insensitive' } },
        { altText:      { contains: term, mode: 'insensitive' } },
        { tags:         { has: term.toLowerCase() } },
      ];
    }

    if (filter.status === 'DELETED') {
      where.deletedAt = { not: null };
    } else if (filter.status === 'ARCHIVED') {
      // Future: add archived status support
    }

    return where;
  }

  private buildOrderBy(sort?: MediaSort): Record<string, unknown> {
    if (!sort) return { createdAt: 'desc' };

    const FIELD_MAP: Record<string, string> = {
      name: 'originalName',
      size: 'size',
      date: 'createdAt',
      type: 'mimeType',
    };

    const field = FIELD_MAP[sort.field] ?? 'createdAt';
    return { [field]: sort.direction };
  }

  /* ================================================================== *
   *  PRIVATE — storage helpers                                          *
   * ================================================================== */

  private async deleteFromStorage(item: MediaItem): Promise<void> {
    // Delete original
    try {
      await this.storage.delete(item.path);
    } catch (err) {
      this.log.warn('Failed to delete original from storage', { path: item.path, error: String(err) });
    }

    // Delete variants
    if (item.variants) {
      const varMap = item.variants as unknown as MediaVariantMapWithWebP;
      for (const [, v] of Object.entries(varMap)) {
        if (v?.url) {
          try {
            // Derive path from URL — strip the storage URL prefix
            const varPath = v.url.replace(/^\/+/, '');
            await this.storage.delete(varPath);
          } catch {
            // Best‑effort variant cleanup
          }
        }
      }
    }
  }

  /* ================================================================== *
   *  PRIVATE — cache helpers                                            *
   * ================================================================== */

  private async invalidateCache(item: MediaItem): Promise<void> {
    if (!this.cache) return;
    await Promise.all([
      this.cache.del(CACHE_KEYS.mediaById(item.id)),
      this.cache.flush(`media:list:*`),
      this.cache.flush(`media:search:*`),
      this.cache.del(CACHE_KEYS.mediaStats()),
      this.cache.del(CACHE_KEYS.folderStats()),
    ]);
  }

  private async invalidateCacheById(id: string): Promise<void> {
    if (!this.cache) return;
    await this.cache.del(CACHE_KEYS.mediaById(id));
  }

  private async invalidateFolderCache(): Promise<void> {
    if (!this.cache) return;
    await Promise.all([
      this.cache.del(CACHE_KEYS.folderList()),
      this.cache.del(CACHE_KEYS.folderStats()),
    ]);
  }

  /* ================================================================== *
   *  PRIVATE — miscellaneous                                            *
   * ================================================================== */

  private async buildFolderPath(parentId: string, childName: string): Promise<string> {
    const parent = await this.prisma.mediaFolder.findUnique({
      where: { id: parentId },
    });
    return parent ? `${parent.path}/${childName}` : childName;
  }
}
