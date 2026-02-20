/**
 * Global Window interface augmentations for third-party SDKs.
 * Eliminates `(window as unknown as Record<string, unknown>).x` casts.
 */

// ─── Captcha Provider SDKs ──────────────────────────────────────────────────

interface HCaptchaAPI {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

interface TurnstileAPI {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

interface GrecaptchaV2 {
  ready: (cb: () => void) => void;
  render: (el: HTMLElement, opts: Record<string, unknown>) => number;
  reset: (id: number) => void;
}

interface GrecaptchaV3 {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: Record<string, unknown>) => Promise<string>;
}

// Union type that covers both V2 and V3
type GrecaptchaAPI = GrecaptchaV2 & Partial<GrecaptchaV3>;

interface Window {
  hcaptcha?: HCaptchaAPI;
  turnstile?: TurnstileAPI;
  grecaptcha?: GrecaptchaAPI;
  /** Dev-mode flag used by captcha logger */
  __DEV__?: boolean;
}
