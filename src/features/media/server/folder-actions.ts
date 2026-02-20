"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { hasCapability } from "@/features/auth/server/capabilities";
import { mediaService } from "@/server/wiring";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";
import { z } from "zod";

/* ─── Schemas ─── */

const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional().nullable(),
});

const renameFolderSchema = z.object({
  name: z.string().min(1).max(100),
});

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

export async function createFolder(data: unknown) {
  const guard = await requireCap("upload_files");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = createFolderSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const folder = await mediaService.createFolder(
      parsed.data.name,
      parsed.data.parentId ?? undefined,
    );
    revalidatePath("/admin/media");
    return { success: true as const, data: folder };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create folder",
    };
  }
}

export async function renameFolder(id: string, data: unknown) {
  const guard = await requireCap("upload_files");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = renameFolderSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const folder = await mediaService.renameFolder(id, parsed.data.name);
    revalidatePath("/admin/media");
    return { success: true as const, data: folder };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to rename folder",
    };
  }
}

export async function deleteFolder(id: string) {
  const guard = await requireCap("upload_files");
  if ("error" in guard) return { success: false as const, error: guard.error };

  try {
    await mediaService.deleteFolder(id);
    revalidatePath("/admin/media");
    return { success: true as const, data: null };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to delete folder",
    };
  }
}
