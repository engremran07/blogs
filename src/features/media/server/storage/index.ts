// media-manager/storage/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Barrel exports for built-in storage adapters.
// ─────────────────────────────────────────────────────────────────────────────

export { LocalStorageProvider } from './local.adapter';
export type { LocalStorageConfig } from './local.adapter';

export { S3StorageProvider } from './s3.adapter';
export type { S3StorageConfig } from './s3.adapter';
