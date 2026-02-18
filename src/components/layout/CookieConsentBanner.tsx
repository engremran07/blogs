"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Cookie categories that can be individually toggled (GDPR mode). */
export type CookieCategory = "essential" | "analytics" | "marketing";

export interface CookieConsentState {
  /** Has the user made a choice? (accept / reject / customise) */
  consented: boolean;
  /** Per-category consent flags. */
  categories: Record<CookieCategory, boolean>;
}

export interface CookieConsentSettings {
  cookieConsentEnabled: boolean;
  cookieConsentMessage: string;
  privacyPolicyUrl: string | null;
  termsOfServiceUrl: string | null;
  gdprEnabled: boolean;
}

// ─── Storage helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = "cookie_consent";
const CONSENT_VERSION = 1; // bump to re-prompt after policy change

interface StoredConsent {
  v: number;
  categories: Record<CookieCategory, boolean>;
}

function readConsent(): CookieConsentState {
  if (typeof window === "undefined") {
    return { consented: false, categories: { essential: true, analytics: false, marketing: false } };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { consented: false, categories: { essential: true, analytics: false, marketing: false } };
    const parsed: StoredConsent = JSON.parse(raw);
    if (parsed.v !== CONSENT_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return { consented: false, categories: { essential: true, analytics: false, marketing: false } };
    }
    return { consented: true, categories: { ...parsed.categories, essential: true } };
  } catch {
    return { consented: false, categories: { essential: true, analytics: false, marketing: false } };
  }
}

function writeConsent(categories: Record<CookieCategory, boolean>) {
  const payload: StoredConsent = { v: CONSENT_VERSION, categories: { ...categories, essential: true } };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

  // Dispatch a custom event so other components (e.g. AnalyticsScripts) react immediately
  window.dispatchEvent(new CustomEvent("cookie-consent-change", { detail: payload.categories }));
}

// ─── Cached snapshot + subscription for useSyncExternalStore ────────────────

/** Cached snapshot for useSyncExternalStore (returns referentially stable values). */
let _consentCacheRaw: string | null | undefined;
let _consentCacheResult: CookieConsentState | null = null;

function getConsentSnapshot(): CookieConsentState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === _consentCacheRaw && _consentCacheResult !== null) {
    return _consentCacheResult;
  }
  _consentCacheRaw = raw;
  _consentCacheResult = readConsent();
  return _consentCacheResult;
}

/** Subscribe to cookie consent changes (localStorage + custom event). */
function subscribeToCookieConsent(callback: () => void) {
  window.addEventListener("cookie-consent-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("cookie-consent-change", callback);
    window.removeEventListener("storage", callback);
  };
}

// ─── Public hook — consumed by AnalyticsScripts, ad tags, etc. ─────────────

/** Default state used on server and during hydration — ensures SSR/client match. */
const DEFAULT_CONSENT: CookieConsentState = {
  consented: false,
  categories: { essential: true, analytics: false, marketing: false },
};

export function useCookieConsent(): CookieConsentState {
  return useSyncExternalStore(
    subscribeToCookieConsent,
    getConsentSnapshot,
    () => DEFAULT_CONSENT,
  );
}

// ─── Banner Component ───────────────────────────────────────────────────────

export function CookieConsentBanner({ settings }: { settings: CookieConsentSettings }) {
  const state = useSyncExternalStore<CookieConsentState | null>(
    subscribeToCookieConsent,
    getConsentSnapshot,
    () => null,
  );
  const [showPrefs, setShowPrefs] = useState(false);
  const [draft, setDraft] = useState<Record<CookieCategory, boolean>>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  const save = useCallback((cats: Record<CookieCategory, boolean>) => {
    writeConsent(cats);
    // state updates automatically via useSyncExternalStore subscription
  }, []);

  const acceptAll = useCallback(() => save({ essential: true, analytics: true, marketing: true }), [save]);
  const rejectAll = useCallback(() => save({ essential: true, analytics: false, marketing: false }), [save]);
  const savePreferences = useCallback(() => {
    save(draft);
    setShowPrefs(false);
  }, [save, draft]);

  // Don't render while hydrating OR if user already consented
  if (!settings.cookieConsentEnabled || !state || state.consented) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-9999 animate-slide-up"
    >
      <div className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-2xl backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/95 sm:p-6">
          {/* ── Main banner ─────────────────────────────────────────── */}
          {!showPrefs && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                {/* Icon */}
                <div className="hidden shrink-0 rounded-xl bg-amber-100 p-3 dark:bg-amber-900/30 sm:block">
                  <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265zm-3 0a.375.375 0 11-.53 0L9 2.845l.265.265zm6 0a.375.375 0 11-.53 0L15 2.845l.265.265z" />
                  </svg>
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                    🍪 Cookie Notice
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {settings.cookieConsentMessage}
                    {settings.privacyPolicyUrl && (
                      <>
                        {" "}
                        <a
                          href={settings.privacyPolicyUrl}
                          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          target={settings.privacyPolicyUrl.startsWith("http") ? "_blank" : undefined}
                          rel={settings.privacyPolicyUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          Privacy Policy
                        </a>
                      </>
                    )}
                    {settings.termsOfServiceUrl && (
                      <>
                        {" · "}
                        <a
                          href={settings.termsOfServiceUrl}
                          className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          target={settings.termsOfServiceUrl.startsWith("http") ? "_blank" : undefined}
                          rel={settings.termsOfServiceUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          Terms of Service
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="mt-4 flex flex-wrap items-center gap-2 sm:justify-end">
                {settings.gdprEnabled && (
                  <>
                    <button
                      onClick={rejectAll}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Reject All
                    </button>
                    <button
                      onClick={() => {
                        if (state) setDraft(state.categories);
                        setShowPrefs(true);
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Manage Preferences
                    </button>
                  </>
                )}
                <button
                  onClick={acceptAll}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-900"
                >
                  {settings.gdprEnabled ? "Accept All" : "Got it!"}
                </button>
              </div>
            </>
          )}

          {/* ── Preference panel (GDPR) ────────────────────────────── */}
          {showPrefs && (
            <>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Manage Cookie Preferences
              </h3>
              <div className="space-y-3">
                {([
                  {
                    key: "essential" as const,
                    label: "Essential",
                    desc: "Required for authentication, security, and basic site functionality. Cannot be disabled.",
                    locked: true,
                  },
                  {
                    key: "analytics" as const,
                    label: "Analytics",
                    desc: "Help us understand how visitors use the site so we can improve content and performance.",
                    locked: false,
                  },
                  {
                    key: "marketing" as const,
                    label: "Marketing",
                    desc: "Used to show relevant advertisements and measure ad campaign effectiveness.",
                    locked: false,
                  },
                ] as const).map((cat) => (
                  <label
                    key={cat.key}
                    className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                  >
                    <input
                      type="checkbox"
                      checked={draft[cat.key]}
                      disabled={cat.locked}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, [cat.key]: e.target.checked }))
                      }
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {cat.label}
                      </span>
                      {cat.locked && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Always on</span>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {cat.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-5 flex gap-2 justify-end">
                <button
                  onClick={() => setShowPrefs(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={savePreferences}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:ring-offset-gray-900"
                >
                  Save Preferences
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
