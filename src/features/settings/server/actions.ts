"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/server/auth";
import { hasCapability } from "@/features/auth/server/capabilities";
import { siteSettingsService } from "@/server/wiring";
import type { UserRole } from "@/features/auth/types";
import type { Capability } from "@/features/auth/server/capabilities";
import { z } from "zod";

/* ─── Schemas ─── */

const updateSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
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

export async function updateSettings(data: unknown) {
  const guard = await requireCap("manage_settings");
  if ("error" in guard) return { success: false as const, error: guard.error };

  const parsed = updateSettingsSchema.safeParse(data);
  if (!parsed.success)
    return { success: false as const, error: parsed.error.message };

  try {
    await siteSettingsService.updateSettings(
      parsed.data.settings as Partial<Record<string, unknown>> & Record<string, unknown>,
    );
    revalidatePath("/admin/settings");
    return { success: true as const, data: null };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Failed to update settings",
    };
  }
}
