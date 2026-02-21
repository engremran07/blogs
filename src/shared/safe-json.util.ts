import { z } from "zod";

export type JsonParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function parseJsonUnknown(raw: string): JsonParseResult<unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return { success: true, data: parsed };
  } catch {
    return { success: false, error: "Invalid JSON" };
  }
}

export function parseJsonWithSchema<T>(
  raw: string,
  schema: z.ZodType<T>,
): JsonParseResult<T> {
  const parsed = parseJsonUnknown(raw);
  if (!parsed.success) {
    return parsed;
  }

  const validated = schema.safeParse(parsed.data);
  if (!validated.success) {
    return { success: false, error: "JSON does not match expected shape" };
  }

  return { success: true, data: validated.data };
}
