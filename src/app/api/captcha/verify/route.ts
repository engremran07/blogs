/**
 * POST /api/captcha/verify
 *
 * Server-side CAPTCHA token verification endpoint.
 * Used by API routes that need to verify captcha tokens.
 * Can also be called standalone for AJAX verification.
 *
 * Body: { captchaToken: string, captchaType?: string, captchaId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { captchaVerificationService } from '@/server/wiring';
import { verifyCaptchaSchema } from '@/features/captcha/server/schemas';
import { createLogger } from '@/server/observability/logger';

const logger = createLogger('api/captcha/verify');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifyCaptchaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      '127.0.0.1';

    const result = await captchaVerificationService.verify({
      token: parsed.data.captchaToken,
      clientIp,
      captchaType: parsed.data.captchaType,
      captchaId: parsed.data.captchaId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'CAPTCHA verification failed' },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Captcha verification endpoint error:', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
