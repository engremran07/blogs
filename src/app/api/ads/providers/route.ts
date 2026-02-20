/**
 * /api/ads/providers — CRUD for ad providers
 * Kill switch: adsEnabled in SiteSettings (reads gated), mutations always allowed for admins
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";
import {
  createProviderSchema,
  listQuerySchema,
} from "@/features/ads/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'moderator' });
    if (errorResponse) return errorResponse;

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { activeOnly } = listQuerySchema.parse(params);
    const providers = await adsService.findAllProviders(activeOnly);
    const safe = providers.map((p) => adsService.stripSensitiveFields(p));
    return NextResponse.json({ success: true, data: safe });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAuth({ level: 'admin' });
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const input = createProviderSchema.parse(body);
    const provider = await adsService.createProvider(input);
    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
