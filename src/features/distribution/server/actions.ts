"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { hasCapability } from "@/features/auth/server/capabilities";
import { distributionService } from "@/server/wiring";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";
import { z } from "zod";

/* ─── Schemas ─── */

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional().default(true),
});

const updateChannelSchema = createChannelSchema.partial();

/* ─── Helpers ─── */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: "Authentication required" as const };
  const role = session.user.role as UserRole;
  const custom = (session.user.customCapabilities ?? []) as Capability[];
  if (!hasCapability(role, "manage_settings", custom))
    return { error: "Insufficient permissions" as const };
  return { session };
}

/* ─── Actions ─── */

export async function createChannel(data: unknown) {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = createChannelSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const channel = await distributionService.createChannel(parsed.data);
    revalidatePath("/admin/distribution");
    return { success: true as const, data: channel };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to create channel",
    };
  }
}

export async function updateChannel(id: string, data: unknown) {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = updateChannelSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    const channel = await distributionService.updateChannel(id, parsed.data);
    revalidatePath("/admin/distribution");
    return { success: true as const, data: channel };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update channel",
    };
  }
}

export async function deleteChannel(id: string) {
  const guard = await requireAdmin();
  if ("error" in guard) return { success: false as const, error: guard.error };

  try {
    await distributionService.deleteChannel(id);
    revalidatePath("/admin/distribution");
    return { success: true as const, data: null };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to delete channel",
    };
  }
}
