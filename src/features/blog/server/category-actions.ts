"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { hasCapability } from "@/features/auth/server/capabilities";
import { blogService } from "@/server/wiring";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";
import { z } from "zod";

/* ─── Schemas ─── */

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  parentId: z.string().uuid().optional().nullable(),
});

const updateCategorySchema = createCategorySchema.partial();

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

export async function createCategory(data: unknown) {
  const guard = await requireCap("manage_categories");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = createCategorySchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const cat = await blogService.createCategory(parsed.data);
    revalidatePath("/admin/categories");
    return { success: true as const, data: cat };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create category",
    };
  }
}

export async function updateCategory(id: string, data: unknown) {
  const guard = await requireCap("manage_categories");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = updateCategorySchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const cat = await blogService.updateCategory(id, parsed.data);
    revalidatePath("/admin/categories");
    return { success: true as const, data: cat };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update category",
    };
  }
}

export async function deleteCategory(id: string) {
  const guard = await requireCap("manage_categories");
  if ("error" in guard) return { success: false as const, error: guard.error };

  try {
    await blogService.deleteCategory(id);
    revalidatePath("/admin/categories");
    return { success: true as const, data: null };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to delete category",
    };
  }
}
