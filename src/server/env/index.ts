import "server-only";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),

  DATABASE_URL_UNPOOLED: z.string().url().optional(),

  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Auth — AUTH_SECRET is required in production (NextAuth v5 mandatory)
  AUTH_SECRET: isProduction
    ? z.string().min(32, "AUTH_SECRET must be at least 32 characters in production")
    : z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(), // legacy alias
  NEXTAUTH_URL: z.string().url().optional(),

  // JWT tokens — only needed if custom AuthService is wired to API routes
  // Currently unused: all auth flows go through NextAuth v5 (AUTH_SECRET)
  JWT_SECRET: z.string().min(1).optional(),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),

  // Server Actions encryption key — required for VPS rolling deploys
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: z.string().min(1).optional(),

  // Site URL for distribution / OG links
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),

  OPENAI_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  CLOUDFLARE_TURNSTILE_SECRET: z.string().min(1).optional(),

  // Captcha provider site keys (optional — can also be stored in DB settings)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_HCAPTCHA_SITE_KEY: z.string().min(1).optional(),

  // Media / S3 storage (optional — falls back to local filesystem)
  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_PUBLIC_URL: z.string().url().optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ✗ ${i.path.join(".")}: ${i.message}`)
      .join("\n");

    console.error(
      `\n❌ Invalid environment variables:\n${formatted}\n`,
    );
    throw new Error("Missing or invalid environment variables — see above.");
  }

  return result.data;
}

export const env = parseEnv();
