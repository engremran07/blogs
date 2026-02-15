// media-manager/storage/local.adapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Local‑filesystem storage adapter implementing `StorageProvider`.
// Uses Node.js `fs/promises` — consumers pass it directly into
// `MediaService` via constructor DI.
// ─────────────────────────────────────────────────────────────────────────────

import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import type { StorageProvider } from '../../types';

export interface LocalStorageConfig {
  /** Absolute path to the uploads root directory (e.g. `/app/public/uploads`). */
  rootDir: string;

  /**
   * Public URL prefix that maps to `rootDir`.
   * E.g. `'/uploads'` or `'https://cdn.example.com/uploads'`.
   */
  urlPrefix: string;

  /**
   * Whether to create directories recursively on upload.
   * @default true
   */
  autoCreateDirs?: boolean;
}

/**
 * Local‑filesystem storage adapter.
 *
 * ```ts
 * const storage = new LocalStorageProvider({
 *   rootDir:   path.join(process.cwd(), 'public/uploads'),
 *   urlPrefix: '/uploads',
 * });
 *
 * const url = await storage.upload(buffer, 'images/photo.jpg', 'image/jpeg');
 * // → '/uploads/images/photo.jpg'
 * ```
 */
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;
  private readonly urlPrefix: string;
  private readonly autoCreate: boolean;

  constructor(config: LocalStorageConfig) {
    this.rootDir    = path.resolve(config.rootDir);
    this.urlPrefix  = config.urlPrefix.replace(/\/+$/, '');
    this.autoCreate = config.autoCreateDirs ?? true;
  }

  /* ------------------------------------------------------------------ *
   *  StorageProvider interface                                          *
   * ------------------------------------------------------------------ */

  async upload(
    buffer: Buffer | Uint8Array,
    destPath: string,
    _contentType?: string,
  ): Promise<string> {
    const fullPath = this.resolve(destPath);

    if (this.autoCreate) {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
    }

    await fs.writeFile(fullPath, buffer);
    return this.getUrl(destPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      // Ignore "file not found" — idempotent deletes
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  getUrl(filePath: string): string {
    // Normalise separators to forward slashes for URL paths
    const normalised = filePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${this.urlPrefix}/${normalised}`;
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async move(fromPath: string, toPath: string): Promise<string> {
    const from = this.resolve(fromPath);
    const to   = this.resolve(toPath);

    if (this.autoCreate) {
      await fs.mkdir(path.dirname(to), { recursive: true });
    }

    await fs.rename(from, to);
    return this.getUrl(toPath);
  }

  async getStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolve(filePath);
    // Ensure file exists before creating stream
    await fs.access(fullPath);
    return fsSync.createReadStream(fullPath);
  }

  async listFolder(prefix: string): Promise<string[]> {
    const dir = this.resolve(prefix);
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries.map((e) =>
        e.isDirectory()
          ? `${prefix}/${e.name}/`
          : `${prefix}/${e.name}`,
      );
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
  }

  /* ------------------------------------------------------------------ *
   *  Internal helpers                                                   *
   * ------------------------------------------------------------------ */

  /** Resolve a relative storage path to an absolute filesystem path. */
  private resolve(relativePath: string): string {
    const normalised = path.normalize(relativePath);
    const resolved   = path.resolve(this.rootDir, normalised);

    // Prevent path traversal outside rootDir
    if (!resolved.startsWith(this.rootDir)) {
      throw new Error('Path traversal detected — cannot access files outside root directory');
    }

    return resolved;
  }
}
