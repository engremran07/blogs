"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { hasCapability } from "@/features/auth/server/capabilities";
import { tagService } from "@/server/wiring";
import {
  createTagSchema,
  updateTagSchema,
  bulkIdsSchema,
} from "@/features/tags/server/schemas";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";

/* ─── Helpers ─── */

async function requireCap(capability: Capability) {
  const session = await auth();
  if (!session?.user) return { error: "Authentication required" as const };
  const role = session.user.role as UserRole;
  const custom = (session.user.customCapabilities ?? []) as Capability[];
  if (!hasCapability(role, capability, custom))
    return { error: "Insufficient permissions" as const };
  return { session };
}

/* ─── Actions ─── */

export async function createTag(data: unknown) {
  const guard = await requireCap("manage_tags");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = createTagSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const tag = await tagService.create(parsed.data);
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { success: true as const, data: tag };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create tag",
    };
  }
}

export async function updateTag(id: string, data: unknown) {
  const guard = await requireCap("manage_tags");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = updateTagSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const tag = await tagService.update(id, parsed.data);
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { success: true as const, data: tag };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update tag",
    };
  }
}

export async function deleteTag(id: string) {
  const guard = await requireCap("manage_tags");
  if ("error" in guard) return { success: false as const, error: guard.error };

  try {
    await tagService.delete(id);
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { success: true as const, data: null };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to delete tag",
    };
  }
}

export async function bulkDeleteTags(ids: unknown) {
  const guard = await requireCap("manage_tags");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = bulkIdsSchema.safeParse(ids);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const result = await tagService.bulkDelete(parsed.data.tagIds);
    revalidatePath("/admin/tags");
    revalidatePath("/tags");
    return { success: true as const, data: result };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to delete tags",
    };
  }
}
