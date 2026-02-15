/**
 * /api/ads/compliance — Run compliance scan on active placements
 * Kill switch: enableComplianceScanning in ads config
 *
 * GET  — Run scan (idempotent read-only check)
 * POST — Run scan (alias for GET, kept for backward compat)
 */
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { adsService } from "@/server/wiring";

async function runComplianceScan() {
  const session = await auth();
  if (!session?.user || !["ADMINISTRATOR", "SUPER_ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const result = await adsService.scanCompliance();
  return NextResponse.json({ success: true, data: result });
}

export async function GET() {
  try {
    return await runComplianceScan();
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}

export async function POST() {
  try {
    return await runComplianceScan();
  } catch (error) {
    const status = (error as any)?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal error" },
      { status },
    );
  }
}
