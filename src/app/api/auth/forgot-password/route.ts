import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/server/schemas";
import { createLogger } from "@/server/observability/logger";
import {
  authService,
  captchaAdminSettings,
  captchaVerificationService,
} from "@/server/wiring";

const logger = createLogger("api/auth/forgot-password");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const captchaRequired = await captchaAdminSettings.isCaptchaRequired({
      service: "passwordReset",
    });

    if (captchaRequired.required) {
      const { captchaToken, captchaType, captchaId } = body;
      if (!captchaToken) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification is required" },
          { status: 400 },
        );
      }

      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        req.headers.get("x-real-ip") ??
        "127.0.0.1";

      const captchaResult = await captchaVerificationService.verify({
        token: captchaToken,
        clientIp,
        captchaType,
        captchaId,
      });

      if (!captchaResult.success) {
        return NextResponse.json(
          { success: false, error: "CAPTCHA verification failed" },
          { status: 403 },
        );
      }
    }

    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const messages = parsed.error.issues.map((e) => e.message).join(", ");
      return NextResponse.json(
        { success: false, error: messages },
        { status: 400 },
      );
    }

    const result = await authService.forgotPassword(parsed.data.email);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("[api/auth/forgot-password] POST error:", { error });
    return NextResponse.json(
      { success: false, error: "Failed to request password reset" },
      { status: 500 },
    );
  }
}
