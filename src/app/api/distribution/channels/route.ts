/**
 * /api/distribution/channels — CRUD for distribution channels
 * Kill switch: distributionEnabled in SiteSettings
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";
import { createChannelSchema } from "@/features/distribution/server/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const enabledOnly = req.nextUrl.searchParams.get("enabledOnly") === "true";
    const channels = await distributionService.getChannels(enabledOnly);
    return NextResponse.json({ success: true, data: channels });
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
    const input = createChannelSchema.parse(body);
    const channel = await distributionService.createChannel(input as any);
    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  } catch (error) {
    if ((error as any)?.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: (error as any).issues?.map((i: any) => i.message).join(", ") },
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
