"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { useSyncExternalStore, useCallback } from "react";

const subscribeNoop = () => () => {};
const getTrue = () => true;
const getFalse = () => false;

type ThemeMode = "system" | "light" | "dark";

const CYCLE: ThemeMode[] = ["system", "light", "dark"];

const LABELS: Record<ThemeMode, string> = {
  system: "Auto (system)",
  light: "Light",
  dark: "Dark",
};

/**
 * Single-button theme toggle that cycles: Auto → Light → Dark → Auto
 * Default is Auto (system). Preference persisted via next-themes (localStorage).
 *
 * @param variant - "icon" (site header), "pill" (segmented control),
 *                  "adminbar" (dark admin bar bg)
 */
export function ThemeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "pill" | "adminbar";
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeNoop, getTrue, getFalse);

  const current: ThemeMode =
    theme === "light" || theme === "dark" ? theme : "system";

  const cycle = useCallback(() => {
    const idx = CYCLE.indexOf(current);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  }, [current, setTheme]);

  if (!mounted) return null;

  // Pick icon based on effective state
  const Icon =
    current === "system" ? Monitor : resolvedTheme === "dark" ? Moon : Sun;

  /* ── Pill variant: segmented control ── */
  if (variant === "pill") {
    return (
      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800">
        {CYCLE.map((value) => {
          const ModeIcon =
            value === "system" ? Monitor : value === "light" ? Sun : Moon;
          const label =
            value === "system" ? "Auto" : value === "light" ? "Light" : "Dark";
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                current === value
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
              aria-label={`${label} theme`}
              title={`${label} theme`}
            >
              <ModeIcon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  /* ── AdminBar variant: single icon button on dark bg ── */
  if (variant === "adminbar") {
    return (
      <button
        onClick={cycle}
        className="flex items-center gap-1 rounded px-1.5 py-1 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        aria-label={`Theme: ${LABELS[current]}`}
        title={`Theme: ${LABELS[current]} — click to switch`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    );
  }

  /* ── Icon variant (default): single button that cycles ── */
  return (
    <button
      onClick={cycle}
      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
      aria-label={`Theme: ${LABELS[current]}`}
      title={`Theme: ${LABELS[current]} — click to switch`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
