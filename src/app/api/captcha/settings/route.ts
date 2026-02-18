/**
 * GET /api/captcha/settings
 *
 * Public endpoint — returns frontend-safe captcha configuration.
 * The <Captcha> orchestrator self-fetches from here when no `settings` prop
 * is provided, so every consumer page (login, register, contact) works
 * automatically without explicit wiring.
 */

import { NextResponse } from "next/server";
import { captchaAdminSettings } from "@/server/wiring";

export async function GET() {
  try {
    const settings = await captchaAdminSettings.getFrontendSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    // If settings can't be loaded, return disabled — safe default
    return NextResponse.json({ captchaEnabled: false });
  }
}
