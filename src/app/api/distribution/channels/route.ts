/**
 * /api/distribution/channels — CRUD for distribution channels
 * Kill switch: distributionEnabled in SiteSettings
 */
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";
import { createChannelSchema } from "@/features/distribution/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const enabledOnly = req.nextUrl.searchParams.get("enabledOnly") === "true";
    const channels = await distributionService.getChannels(enabledOnly);
    return NextResponse.json({ success: true, data: channels });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = createChannelSchema.parse(body);
    const channel = await distributionService.createChannel(input);
    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues.map((i) => i.message).join(", ") },
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
