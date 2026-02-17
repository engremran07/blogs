/**
 * /api/distribution/settings — Read / update distribution configuration
 * Kill switch: admin-only
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";
import { updateDistributionSettingsSchema } from "@/features/distribution/server/schemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // Return current config (safe subset)
    const stats = await distributionService.getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const input = updateDistributionSettingsSchema.parse(body);
    await distributionService.updateConfig(input);
    return NextResponse.json({ success: true, data: { message: "Distribution settings updated" } });
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
