/**
 * /api/ads/compliance — Run compliance scan on active placements
 * Kill switch: enableComplianceScanning in ads config
 *
 * GET  — Run scan (idempotent read-only check)
 * POST — Run scan (alias for GET, kept for backward compat)
 */
import { NextResponse } from "next/server";
import { requireAuth } from "@/server/api-auth";
import { adsService } from "@/server/wiring";

async function runComplianceScan() {
  const { errorResponse } = await requireAuth({ level: 'admin' });
  if (errorResponse) return errorResponse;

  const result = await adsService.scanCompliance();
  return NextResponse.json({ success: true, data: result });
}

export async function GET() {
  try {
    return await runComplianceScan();
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}

export async function POST() {
  try {
    return await runComplianceScan();
  } catch (error) {
    const status = (error as { statusCode?: number })?.statusCode ?? 500;
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status },
    );
  }
}
