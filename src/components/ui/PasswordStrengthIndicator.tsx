"use client";

/**
 * ============================================================================
 * PasswordStrengthIndicator — Real-time inline password policy checker
 *
 * Shows live checkmarks/crosses for each rule as the user types.
 * Includes a strength meter bar. Matches the backend password policy from
 * auth/server/constants.ts (min 12 chars, uppercase, lowercase, digit,
 * special character, no common passwords).
 * ============================================================================
 */

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import clsx from "clsx";

/* ── Default policy (mirrors DEFAULT_USER_CONFIG in auth/server/constants) ── */
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const WEAK_PASSWORDS = [
  "password123!",
  "123456789abc",
  "qwerty123!",
  "admin123!",
  "welcome123!",
  "letmein123!",
  "changeme123!",
  "password1234!",
];

interface PasswordRule {
  key: string;
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  {
    key: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    key: "maxLength",
    label: `No more than ${PASSWORD_MAX_LENGTH} characters`,
    test: (pw) => pw.length <= PASSWORD_MAX_LENGTH,
  },
  {
    key: "uppercase",
    label: "At least 1 uppercase letter (A–Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    key: "lowercase",
    label: "At least 1 lowercase letter (a–z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    key: "digit",
    label: "At least 1 digit (0–9)",
    test: (pw) => /\d/.test(pw),
  },
  {
    key: "special",
    label: "At least 1 special character (!@#$...)",
    test: (pw) => /[^A-Za-z0-9\s]/.test(pw),
  },
  {
    key: "notWeak",
    label: "Not a common/weak password",
    test: (pw) => {
      const lower = pw.toLowerCase();
      return !WEAK_PASSWORDS.some((w) => lower.includes(w));
    },
  },
];

interface Props {
  password: string;
  /** Optional: show match check against a confirmation field */
  confirmPassword?: string;
  /** Only render when password is non-empty */
  showWhenEmpty?: boolean;
  className?: string;
}

export function PasswordStrengthIndicator({
  password,
  confirmPassword,
  showWhenEmpty = false,
  className,
}: Props) {
  const results = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount;
  const strengthPercent = Math.round((passedCount / totalCount) * 100);

  const strengthLabel =
    strengthPercent === 100
      ? "Strong"
      : strengthPercent >= 70
        ? "Good"
        : strengthPercent >= 40
          ? "Fair"
          : "Weak";

  const strengthColor =
    strengthPercent === 100
      ? "bg-green-500"
      : strengthPercent >= 70
        ? "bg-blue-500"
        : strengthPercent >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  const strengthTextColor =
    strengthPercent === 100
      ? "text-green-600 dark:text-green-400"
      : strengthPercent >= 70
        ? "text-blue-600 dark:text-blue-400"
        : strengthPercent >= 40
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  if (!password && !showWhenEmpty) return null;

  return (
    <div className={clsx("space-y-2", className)}>
      {/* Strength bar */}
      {password && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Password strength
            </span>
            <span className={clsx("text-xs font-medium", strengthTextColor)}>
              {strengthLabel}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-300",
                strengthColor,
              )}
              style={{ width: `${strengthPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rules checklist */}
      <ul className="space-y-0.5">
        {results.map((rule) => (
          <li
            key={rule.key}
            className={clsx(
              "flex items-center gap-1.5 text-xs transition-colors",
              !password
                ? "text-gray-400 dark:text-gray-500"
                : rule.passed
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400",
            )}
          >
            {!password ? (
              <span className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600" />
            ) : rule.passed ? (
              <Check className="h-3 w-3 shrink-0" />
            ) : (
              <X className="h-3 w-3 shrink-0" />
            )}
            {rule.label}
          </li>
        ))}

        {/* Confirm password match */}
        {confirmPassword !== undefined && (
          <li
            className={clsx(
              "flex items-center gap-1.5 text-xs transition-colors",
              !password && !confirmPassword
                ? "text-gray-400 dark:text-gray-500"
                : password && confirmPassword && password === confirmPassword
                  ? "text-green-600 dark:text-green-400"
                  : confirmPassword
                    ? "text-red-500 dark:text-red-400"
                    : "text-gray-400 dark:text-gray-500",
            )}
          >
            {password && confirmPassword ? (
              password === confirmPassword ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <X className="h-3 w-3 shrink-0" />
              )
            ) : (
              <span className="h-3 w-3 rounded-full border border-gray-300 dark:border-gray-600" />
            )}
            Passwords match
          </li>
        )}
      </ul>

      {/* All passed message */}
      {allPassed &&
        password &&
        (confirmPassword === undefined || password === confirmPassword) && (
          <p className="text-xs font-medium text-green-600 dark:text-green-400">
            Password meets all requirements
          </p>
        )}
    </div>
  );
}

/**
 * Returns true if password passes ALL policy rules.
 * Use in form submit handlers to gate submission.
 */
export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
