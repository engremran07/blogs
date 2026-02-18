import "server-only";
import { Redis } from "@upstash/redis";
import { createLogger } from "@/server/observability/logger";
import { env } from "@/server/env";

const logger = createLogger("redis");

const url = env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Singleton Upstash Redis client.
 * Falls back to a no-op proxy in local dev when credentials are missing.
 */
function createRedisClient(): Redis {
  if (url && token && url !== "http://localhost:3001") {
    return new Redis({ url, token });
  }

  // No-op fallback for local development without Upstash.
  // Only warn in production — in dev this is expected.
  if (process.env.NODE_ENV === "production") {
    logger.warn(
      "UPSTASH_REDIS_REST_URL not configured — using in-memory no-op fallback"
    );
  }

  const noopHandler: ProxyHandler<Redis> = {
    get(_target, prop) {
      if (typeof prop === "string") {
        return (..._args: unknown[]) => Promise.resolve(null);
      }
      return undefined;
    },
  };

  return new Proxy({} as Redis, noopHandler);
}

export const redis = createRedisClient();
