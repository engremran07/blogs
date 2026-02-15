// media-manager/events.ts
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight, type‑safe pub/sub event bus for the Media Manager module.
// Follows the same pattern as `distribution/events.ts`.
// **Zero external dependencies.**
// ─────────────────────────────────────────────────────────────────────────────

import type { MediaItem, MediaFolder } from '../types';

/* ====================================================================== *
 *  Event identifiers                                                     *
 * ====================================================================== */

export enum MediaEvent {
  /** A single file was uploaded and persisted. */
  UPLOADED          = 'media.uploaded',

  /** A media item's metadata was updated (alt text, tags, etc.). */
  UPDATED           = 'media.updated',

  /** A single media item was deleted. */
  DELETED           = 'media.deleted',

  /** A media item was moved to a different folder. */
  MOVED             = 'media.moved',

  /** Image variants were generated/regenerated. */
  OPTIMIZED         = 'media.optimized',

  /** Variants were generated for a single preset. */
  VARIANT_GENERATED = 'media.variant_generated',

  /** Multiple items were deleted in one operation. */
  BULK_DELETED      = 'media.bulk_deleted',

  /** Multiple items were moved in one operation. */
  BULK_MOVED        = 'media.bulk_moved',

  /** Tags were updated on multiple items. */
  BULK_TAGGED       = 'media.bulk_tagged',

  /** A folder was created. */
  FOLDER_CREATED    = 'media.folder_created',

  /** A folder was renamed. */
  FOLDER_RENAMED    = 'media.folder_renamed',

  /** A folder was deleted. */
  FOLDER_DELETED    = 'media.folder_deleted',

  /** Orphan cleanup completed. */
  CLEANUP_COMPLETED = 'media.cleanup_completed',

  /** Soft‑deleted items were purged. */
  PURGE_COMPLETED   = 'media.purge_completed',
}

/* ====================================================================== *
 *  Event payloads                                                        *
 * ====================================================================== */

export interface MediaUploadedPayload {
  item: MediaItem;
  userId?: string;
}

export interface MediaUpdatedPayload {
  item: MediaItem;
  changes: Record<string, unknown>;
  userId?: string;
}

export interface MediaDeletedPayload {
  id: string;
  filename: string;
  userId?: string;
}

export interface MediaMovedPayload {
  item: MediaItem;
  fromFolder: string;
  toFolder: string;
  userId?: string;
}

export interface MediaOptimizedPayload {
  item: MediaItem;
  variantsGenerated: string[];
}

export interface MediaVariantGeneratedPayload {
  mediaId: string;
  preset: string;
  variant: { url: string; width: number; height: number; format: string; size: number };
}

export interface MediaBulkDeletedPayload {
  ids: string[];
  count: number;
  userId?: string;
}

export interface MediaBulkMovedPayload {
  ids: string[];
  targetFolder: string;
  count: number;
  userId?: string;
}

export interface MediaBulkTaggedPayload {
  ids: string[];
  tags: string[];
  mode: 'add' | 'replace' | 'remove';
  count: number;
  userId?: string;
}

export interface MediaFolderCreatedPayload {
  folder: MediaFolder;
  userId?: string;
}

export interface MediaFolderRenamedPayload {
  folder: MediaFolder;
  oldName: string;
  userId?: string;
}

export interface MediaFolderDeletedPayload {
  id: string;
  name: string;
  userId?: string;
}

export interface MediaCleanupCompletedPayload {
  removedCount: number;
  freedBytes: number;
}

export interface MediaPurgeCompletedPayload {
  purgedCount: number;
  freedBytes: number;
}

/* ====================================================================== *
 *  Event → payload type map                                              *
 * ====================================================================== */

export interface MediaEventPayloadMap {
  [MediaEvent.UPLOADED]:          MediaUploadedPayload;
  [MediaEvent.UPDATED]:           MediaUpdatedPayload;
  [MediaEvent.DELETED]:           MediaDeletedPayload;
  [MediaEvent.MOVED]:             MediaMovedPayload;
  [MediaEvent.OPTIMIZED]:         MediaOptimizedPayload;
  [MediaEvent.VARIANT_GENERATED]: MediaVariantGeneratedPayload;
  [MediaEvent.BULK_DELETED]:      MediaBulkDeletedPayload;
  [MediaEvent.BULK_MOVED]:        MediaBulkMovedPayload;
  [MediaEvent.BULK_TAGGED]:       MediaBulkTaggedPayload;
  [MediaEvent.FOLDER_CREATED]:    MediaFolderCreatedPayload;
  [MediaEvent.FOLDER_RENAMED]:    MediaFolderRenamedPayload;
  [MediaEvent.FOLDER_DELETED]:    MediaFolderDeletedPayload;
  [MediaEvent.CLEANUP_COMPLETED]: MediaCleanupCompletedPayload;
  [MediaEvent.PURGE_COMPLETED]:   MediaPurgeCompletedPayload;
}

/* ====================================================================== *
 *  Event listener type                                                   *
 * ====================================================================== */

type Listener<T> = (payload: T) => void | Promise<void>;

/* ====================================================================== *
 *  Event bus                                                             *
 * ====================================================================== */

/**
 * Type‑safe, synchronous event bus for the Media Manager module.
 *
 * ```ts
 * const bus = new MediaEventBus();
 *
 * bus.on(MediaEvent.UPLOADED, (payload) => {
 *   console.log('Uploaded:', payload.item.originalName);
 * });
 *
 * bus.emit(MediaEvent.UPLOADED, { item, userId: 'u1' });
 * ```
 */
export class MediaEventBus {
  private readonly listeners = new Map<string, Set<Listener<unknown>>>();

  /**
   * Register a listener for a specific event.
   * Returns an unsubscribe function.
   */
  on<E extends MediaEvent>(
    event: E,
    listener: Listener<MediaEventPayloadMap[E]>,
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const set = this.listeners.get(event)!;
    set.add(listener as Listener<unknown>);

    return () => {
      set.delete(listener as Listener<unknown>);
      if (set.size === 0) this.listeners.delete(event);
    };
  }

  /**
   * Remove a specific listener for an event.
   */
  off<E extends MediaEvent>(
    event: E,
    listener: Listener<MediaEventPayloadMap[E]>,
  ): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener as Listener<unknown>);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  /**
   * Emit an event with the corresponding payload.
   * Listeners are invoked synchronously; if a listener returns a
   * Promise it is awaited internally (fire‑and‑forget).
   */
  emit<E extends MediaEvent>(
    event: E,
    payload: MediaEventPayloadMap[E],
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;

    for (const listener of set) {
      try {
        const result = listener(payload);
        // Swallow rejected promises so one bad listener can't crash others
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {/* swallow */});
        }
      } catch {
        // swallow synchronous errors from individual listeners
      }
    }
  }

  /** Remove all listeners (useful for testing). */
  clear(): void {
    this.listeners.clear();
  }

  /** Check how many listeners are registered for an event. */
  listenerCount(event: MediaEvent): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}
