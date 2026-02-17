/**
 * /api/distribution/health — Platform health check endpoint.
 * Returns circuit breaker and rate limiting status per platform.
 */
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { distributionService } from "@/server/wiring";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN", "EDITOR"].includes((session.user as any).role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const health = await distributionService.healthCheck();
    return NextResponse.json({ success: true, data: health });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
