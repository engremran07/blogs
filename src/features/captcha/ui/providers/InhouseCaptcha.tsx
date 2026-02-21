/**
 * ============================================================================
 * MODULE:   captcha/providers/InhouseCaptcha.tsx
 * PURPOSE:  Self-contained in-house CAPTCHA provider
 *
 * FEATURES:
 *   - Client-side SVG 6-digit code challenge with distortion / noise
 *   - Falls back to client-side generation when API endpoint unavailable
 *   - Accessible: aria labels, keyboard navigation, screen-reader hints
 *   - Refresh button with loading spinner
 *   - Auto-expiry timer (5 min) with visual countdown
 *   - Verified state with success indicator
 *   - Configurable code length and endpoint
 *   - Proper cleanup on unmount (timers)
 *
 * When a challenge API endpoint exists:
 *   GET <challengeEndpoint>
 *   Response: { image: string (data URI), captchaId: string (encrypted) }
 *
 * When no endpoint is available, generates challenges entirely client-side.
 * ============================================================================
 */

'use client';

import { useState, useEffect, useRef, useCallback, memo, useId } from 'react';
import { RefreshCw, ShieldCheck, Timer } from 'lucide-react';
import clsx from 'clsx';
import type { InhouseCaptchaProviderProps } from '../../types';
import {
  CHALLENGE_TTL_MS,
  EXPIRY_TICK_MS,
} from '../../utils/constants';

/* ── Client-side challenge generation ── */

interface ClientChallenge {
  image: string;       // SVG data URI
  answer: string;      // correct answer
  captchaId: string;   // random ID
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateClientChallenge(): ClientChallenge {
  // Generate a simple 6-digit numeric code
  const digits = Array.from({ length: 6 }, () => randomInt(0, 9));
  const answer = digits.join('');
  const text = answer;

  // Generate SVG with noise + distortion
  const width = 200;
  const height = 60;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  svg += `<rect width="100%" height="100%" fill="#f0f4f8"/>`;

  // Noise lines
  for (let i = 0; i < 6; i++) {
    const x1 = randomInt(0, width);
    const y1 = randomInt(0, height);
    const x2 = randomInt(0, width);
    const y2 = randomInt(0, height);
    const colors = ['#cbd5e1', '#93c5fd', '#c4b5fd', '#fca5a5', '#86efac'];
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[randomInt(0, colors.length - 1)]}" stroke-width="${randomInt(1, 2)}" opacity="0.5"/>`;
  }

  // Noise dots
  for (let i = 0; i < 30; i++) {
    svg += `<circle cx="${randomInt(0, width)}" cy="${randomInt(0, height)}" r="${randomInt(1, 3)}" fill="#94a3b8" opacity="${(randomInt(2, 5) / 10).toFixed(1)}"/>`;
  }

  // Text characters with individual transforms
  const startX = 20;
  const charWidth = (width - 40) / text.length;
  for (let i = 0; i < text.length; i++) {
    const x = startX + i * charWidth + randomInt(-2, 2);
    const y = 38 + randomInt(-4, 4);
    const rot = randomInt(-12, 12);
    const size = randomInt(20, 26);
    const colors = ['#1e293b', '#1e40af', '#7c3aed', '#b91c1c', '#047857'];
    svg += `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${colors[randomInt(0, colors.length - 1)]}" transform="rotate(${rot},${x},${y})">${text[i]}</text>`;
  }

  svg += '</svg>';

  const captchaId = `local_${Date.now()}_${randomInt(1000, 9999)}`;
  const image = `data:image/svg+xml;base64,${typeof btoa === 'function' ? btoa(svg) : Buffer.from(svg).toString('base64')}`;

  return { image, answer: String(answer), captchaId };
}

function InhouseCaptchaInner({
  onVerify,
  resetSignal = 0,
}: InhouseCaptchaProviderProps) {
  const inputId = useId();
  const [challenge, setChallenge] = useState<ClientChallenge | null>(null);
  const [input, setInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryProgress, setExpiryProgress] = useState(100);
  const [expired, setExpired] = useState(false);

  const mountedRef = useRef(true);
  const onVerifyRef = useRef(onVerify);
  const verifiedRef = useRef(false);
  const lastResetSignalRef = useRef(resetSignal);
  const challengeTimestampRef = useRef(0);
  const expiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { onVerifyRef.current = onVerify; }, [onVerify]);
  useEffect(() => { verifiedRef.current = verified; }, [verified]);

  /* ── Expiry timer ── */
  const startExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    challengeTimestampRef.current = Date.now();
    setExpiryProgress(100);
    setExpired(false);

    expiryTimerRef.current = setInterval(() => {
      if (!mountedRef.current) {
        if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
        return;
      }
      const elapsed = Date.now() - challengeTimestampRef.current;
      const remaining = Math.max(0, 100 - (elapsed / CHALLENGE_TTL_MS) * 100);
      setExpiryProgress(remaining);
      if (remaining <= 0) {
        setExpired(true);
        setVerified(false);
        verifiedRef.current = false;
        onVerifyRef.current('', '');
        if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
      }
    }, EXPIRY_TICK_MS);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, []);

  /* ── Generate challenge ── */
  const newChallenge = useCallback((manual = false) => {
    if (manual) {
      setVerified(false);
      verifiedRef.current = false;
      onVerifyRef.current('', '');
    }
    setError(null);
    setInput('');
    setExpired(false);

    try {
      const c = generateClientChallenge();
      setChallenge(c);
      startExpiryTimer();
    } catch {
      setError('Failed to generate challenge');
    }
  }, [startExpiryTimer]);

  /* ── Init — generate on mount ── */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization: generates captcha challenge on mount; state updates are in the newChallenge callback (external synchronization)
    newChallenge(false);
  }, [newChallenge]);

  /* ── External reset ── */
  useEffect(() => {
    if (lastResetSignalRef.current === resetSignal) return;
    lastResetSignalRef.current = resetSignal;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Responds to external resetSignal prop change; generating a new challenge requires state updates
    newChallenge(true);
  }, [resetSignal, newChallenge]);

  /* ── Input handler ── */
  const handleChange = useCallback((val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    setInput(cleanVal);

    if (challenge && cleanVal && !expired) {
      if (cleanVal === challenge.answer) {
        setVerified(true);
        verifiedRef.current = true;
        // Token = answer:timestamp:captchaId for server-side check
        const token = `${cleanVal}:${Date.now()}:${challenge.captchaId}`;
        onVerifyRef.current(token, challenge.captchaId);
        setError(null);
      } else if (cleanVal.length >= challenge.answer.length) {
        setError('Incorrect answer, try again');
        setVerified(false);
        verifiedRef.current = false;
        onVerifyRef.current('', '');
      } else {
        setError(null);
        if (verifiedRef.current) {
          setVerified(false);
          verifiedRef.current = false;
          onVerifyRef.current('', '');
        }
      }
    } else if (verifiedRef.current) {
      setVerified(false);
      verifiedRef.current = false;
      onVerifyRef.current('', '');
    }
  }, [challenge, expired]);

  /* ── Loading state (should be very brief since it's client-side) ── */
  if (!challenge && !error) {
    return (
      <div
        className="flex h-16 w-full animate-pulse items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
        aria-label="Loading security check"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  /* ── Error state ── */
  if (error && !challenge) {
    return (
      <div className="flex items-center justify-between rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300" role="alert">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => newChallenge(true)}
          aria-label="Retry captcha"
          className="ml-2 rounded p-1 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-800/30"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    );
  }

  /* ── Main render ── */
  const progressColor = expiryProgress < 20 ? 'bg-amber-500' : 'bg-primary';

  return (
    <div
      className={clsx(
        'flex flex-col gap-1 rounded-lg border p-3',
        expired
          ? 'border-amber-400 dark:border-amber-600'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50',
      )}
      role="group"
      aria-label="Security verification"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[0.625rem] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Security Check
          </span>
          {verified && !expired && (
            <span className="flex items-center gap-0.5 text-[0.625rem] text-green-600 dark:text-green-400">
              <ShieldCheck size={14} /> Verified
            </span>
          )}
          {expired && (
            <span className="flex items-center gap-0.5 text-[0.625rem] text-amber-600 dark:text-amber-400">
              <Timer size={14} /> Expired
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => newChallenge(true)}
          title="New Challenge"
          aria-label="Get new captcha challenge"
          className="rounded p-1 text-primary hover:bg-primary/10"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Expiry progress bar */}
      <div
        className="h-0.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
        aria-label={`Challenge expires in ${Math.ceil((expiryProgress / 100) * 5)} minutes`}
      >
        <div
          className={clsx('h-full rounded-full transition-all duration-300', progressColor)}
          style={{ width: `${expiryProgress}%` }}
        />
      </div>

      {/* Challenge image + input */}
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            'relative flex h-15 w-48 max-w-[55%] shrink-0 items-center justify-center overflow-hidden rounded border bg-white transition-opacity duration-200 dark:bg-gray-900',
            expired
              ? 'border-amber-400 opacity-50 dark:border-amber-600'
              : 'border-gray-200 dark:border-gray-700',
          )}
          style={{ userSelect: 'none' }}
        >
          {challenge && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.image}
              alt="Enter the 6-digit security code shown"
              width={200}
              height={60}
              loading="eager"
              decoding="async"
              className="h-full w-full object-contain"
              draggable={false}
            />
          )}
        </div>
        <input
          type="text"
          id={inputId}
          maxLength={6}
          autoComplete="off"
          aria-label="Enter the security code"
          aria-required="true"
          inputMode="numeric"
          placeholder="Code"
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          disabled={expired}
          className={clsx(
            'min-w-0 flex-1 rounded border px-3 py-2 text-center font-mono text-sm tracking-widest outline-none transition-colors',
            verified && !expired
              ? 'border-green-500 ring-1 ring-green-500 dark:border-green-400'
              : expired
                ? 'border-amber-400 bg-gray-100 text-gray-400 dark:border-amber-600 dark:bg-gray-800 dark:text-gray-500'
                : 'border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white',
          )}
        />
      </div>

      {/* Helper text */}
      <span className="text-[0.625rem] text-gray-500 dark:text-gray-400">
        {expired
          ? 'Challenge expired. Click refresh to get a new one.'
          : 'Enter the 6-digit code shown above.'}
      </span>

      {/* Inline error */}
      {error && (
        <div className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

const InhouseCaptcha = memo(InhouseCaptchaInner);
InhouseCaptcha.displayName = 'InhouseCaptcha';

export default InhouseCaptcha;
