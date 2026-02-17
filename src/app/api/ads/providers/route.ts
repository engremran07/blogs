/**
 * /api/ads/providers — CRUD for ad providers
 * Kill switch: adsEnabled in SiteSettings (reads gated), mutations always allowed for admins
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";
import {
  createProviderSchema,
  listQuerySchema,
} from "@/features/ads/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const { activeOnly } = listQuerySchema.parse(params);
    const providers = await adsService.findAllProviders(activeOnly);
    const safe = providers.map((p) => adsService.stripSensitiveFields(p));
    return NextResponse.json({ success: true, data: safe });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = createProviderSchema.parse(body);
    const provider = await adsService.createProvider(input);
    return NextResponse.json({ success: true, data: provider }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.issues.map((e: any) => e.message).join(", ") } },
        { status: 400 },
      );
    }
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
