/**
 * ============================================================================
 * MODULE:   features/jobs/server/idempotency.ts
 * PURPOSE:  Redis-based deduplication for job enqueuing.
 * ============================================================================
 */
import "server-only";

import { redis } from "@/server/cache/redis";

// ─── Key helpers ────────────────────────────────────────────────────────────

function dedupKey(type: string, payloadHash: string): string {
  return `jobs:dedup:${type}:${payloadHash}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns `true` if a job with the same type + payload hash has already been
 * enqueued within the TTL window.
 */
export async function checkIdempotency(
  type: string,
  payloadHash: string,
): Promise<boolean> {
  const key = dedupKey(type, payloadHash);
  const existing = await redis.get(key);
  return existing !== null && existing !== undefined;
}

/**
 * Sets the idempotency marker in Redis.
 *
 * @param ttl — Time-to-live in seconds (default 300 = 5 min).
 */
export async function setIdempotency(
  type: string,
  payloadHash: string,
  ttl: number = 300,
): Promise<void> {
  const key = dedupKey(type, payloadHash);
  await redis.set(key, "1", { ex: ttl });
}
