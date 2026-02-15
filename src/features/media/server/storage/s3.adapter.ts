// media-manager/storage/s3.adapter.ts
// ─────────────────────────────────────────────────────────────────────────────
// Amazon S3 / S3‑compatible storage adapter implementing `StorageProvider`.
// Requires `@aws-sdk/client-s3` as a **peer dependency** — it is never
// bundled, so consumers that don't use S3 pay zero cost.
// ─────────────────────────────────────────────────────────────────────────────

import type { StorageProvider } from '../../types';

/* ====================================================================== *
 *  Minimal SDK type stubs                                                *
 *                                                                        *
 *  These allow the adapter to compile without `@aws-sdk/client-s3`       *
 *  being installed at author‑time.  At runtime the real SDK classes      *
 *  are used via dynamic import.                                          *
 * ====================================================================== */

interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}

/* ====================================================================== *
 *  Configuration                                                         *
 * ====================================================================== */

export interface S3StorageConfig {
  /** S3 bucket name. */
  bucket: string;

  /** AWS region (e.g. `'us-east-1'`). */
  region: string;

  /**
   * Key prefix inside the bucket (e.g. `'uploads/'`).
   * Trailing slash is added automatically if missing.
   */
  prefix?: string;

  /**
   * Public base URL for constructing public links.
   * E.g. `'https://cdn.example.com'` or `'https://bucket.s3.amazonaws.com'`.
   * When omitted, the standard S3 URL pattern is used.
   */
  publicUrl?: string;

  /**
   * Custom S3‑compatible endpoint (e.g. MinIO, DigitalOcean Spaces).
   * Omit for standard AWS S3.
   */
  endpoint?: string;

  /** AWS access key ID (can also come from environment / IAM role). */
  accessKeyId?: string;

  /** AWS secret access key. */
  secretAccessKey?: string;

  /**
   * Canned ACL applied to uploaded objects.
   * @default 'public-read'
   */
  acl?: string;

  /**
   * Whether to use path‑style addressing (required for MinIO).
   * @default false
   */
  forcePathStyle?: boolean;
}

/**
 * S3 / S3‑compatible storage adapter.
 *
 * ```ts
 * const storage = new S3StorageProvider({
 *   bucket: 'my-media',
 *   region: 'us-east-1',
 *   prefix: 'uploads/',
 *   publicUrl: 'https://cdn.example.com',
 * });
 *
 * const url = await storage.upload(buffer, 'images/photo.jpg', 'image/jpeg');
 * // → 'https://cdn.example.com/uploads/images/photo.jpg'
 * ```
 */
export class S3StorageProvider implements StorageProvider {
  private readonly bucket: string;
  private readonly region: string;
  private readonly prefix: string;
  private readonly publicUrl: string;
  private readonly acl: string;
  private readonly endpoint?: string;
  private readonly accessKeyId?: string;
  private readonly secretAccessKey?: string;
  private readonly forcePathStyle: boolean;

  /** Lazily initialised SDK client. */
  private _client: S3ClientLike | null = null;

  constructor(config: S3StorageConfig) {
    this.bucket         = config.bucket;
    this.region         = config.region;
    this.prefix         = (config.prefix ?? '').replace(/\/$/, '') + '/';
    this.acl            = config.acl ?? 'public-read';
    this.endpoint       = config.endpoint;
    this.accessKeyId    = config.accessKeyId;
    this.secretAccessKey = config.secretAccessKey;
    this.forcePathStyle = config.forcePathStyle ?? false;

    if (config.publicUrl) {
      this.publicUrl = config.publicUrl.replace(/\/+$/, '');
    } else if (config.endpoint) {
      this.publicUrl = `${config.endpoint.replace(/\/+$/, '')}/${this.bucket}`;
    } else {
      this.publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com`;
    }
  }

  /* ------------------------------------------------------------------ *
   *  StorageProvider interface                                          *
   * ------------------------------------------------------------------ */

  async upload(
    buffer: Buffer | Uint8Array,
    destPath: string,
    contentType?: string,
  ): Promise<string> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    const key = this.toKey(destPath);

    const command = new s3.PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        Buffer.from(buffer),
      ContentType: contentType ?? 'application/octet-stream',
      ACL:         this.acl as never,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);
    return this.getUrl(destPath);
  }

  async delete(filePath: string): Promise<void> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    const command = new s3.DeleteObjectCommand({
      Bucket: this.bucket,
      Key:    this.toKey(filePath),
    });

    await client.send(command);
  }

  getUrl(filePath: string): string {
    const key = this.toKey(filePath);
    return `${this.publicUrl}/${key}`;
  }

  async exists(filePath: string): Promise<boolean> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    try {
      const command = new s3.HeadObjectCommand({
        Bucket: this.bucket,
        Key:    this.toKey(filePath),
      });
      await client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async move(fromPath: string, toPath: string): Promise<string> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    const sourceKey = this.toKey(fromPath);
    const destKey   = this.toKey(toPath);

    // Copy then delete (S3 has no rename operation)
    const copyCmd = new s3.CopyObjectCommand({
      Bucket:     this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key:        destKey,
      ACL:        this.acl as never,
    });
    await client.send(copyCmd);

    const delCmd = new s3.DeleteObjectCommand({
      Bucket: this.bucket,
      Key:    sourceKey,
    });
    await client.send(delCmd);

    return this.getUrl(toPath);
  }

  async getStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    const command = new s3.GetObjectCommand({
      Bucket: this.bucket,
      Key:    this.toKey(filePath),
    });

    const result = await client.send(command) as { Body?: NodeJS.ReadableStream };
    if (!result.Body) {
      throw new Error(`Object not found: ${filePath}`);
    }
    return result.Body;
  }

  async listFolder(prefix: string): Promise<string[]> {
    const client = await this.getClient();
    const s3 = await import('@aws-sdk/client-s3');

    const fullPrefix = this.toKey(prefix).replace(/\/?$/, '/');

    const command = new s3.ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: fullPrefix,
      MaxKeys: 1000,
    });

    const result = await client.send(command) as {
      Contents?: { Key?: string }[];
    };

    if (!result.Contents) return [];

    return result.Contents
      .filter((obj): obj is { Key: string } => !!obj.Key)
      .map((obj) => obj.Key.replace(this.prefix, ''));
  }

  /* ------------------------------------------------------------------ *
   *  Internal helpers                                                   *
   * ------------------------------------------------------------------ */

  /** Convert a consumer‑facing relative path to an S3 object key. */
  private toKey(filePath: string): string {
    const normalised = filePath
      .replace(/\\/g, '/')
      .replace(/^\/+/, '');

    // Block path traversal patterns
    if (normalised.includes('..') || normalised.includes('./')) {
      throw new Error('Path traversal detected — cannot use ".." in S3 key paths');
    }

    return `${this.prefix}${normalised}`;
  }

  /** Lazily create the S3 client via dynamic import. */
  private async getClient(): Promise<S3ClientLike> {
    if (this._client) return this._client;

    const s3 = await import('@aws-sdk/client-s3');

    const clientConfig: Record<string, unknown> = {
      region: this.region,
    };

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
    }

    if (this.forcePathStyle) {
      clientConfig.forcePathStyle = true;
    }

    if (this.accessKeyId && this.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId:     this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      };
    }

    this._client = new s3.S3Client(clientConfig) as unknown as S3ClientLike;
    return this._client;
  }
}
