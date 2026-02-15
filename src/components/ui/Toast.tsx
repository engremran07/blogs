"use client";

import { useState, useCallback, useTransition, type FormEvent } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify(listeners: typeof toastListeners) {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(message: string, type: ToastType = "info") {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  notify(toastListeners);
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify(toastListeners);
  }, 4000);
}

export function useToasts() {
  const [items, setItems] = useState<Toast[]>([]);
  const subscribe = useCallback(() => {
    toastListeners.push(setItems);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== setItems);
    };
  }, []);

  // Subscribe on mount
  useState(() => {
    const unsub = subscribe();
    return unsub;
  });

  return items;
}

const typeColors: Record<ToastType, string> = {
  success: "bg-green-600",
  error: "bg-red-600",
  info: "bg-blue-600",
  warning: "bg-yellow-500",
};

export function ToastContainer() {
  const items = useToasts();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`${typeColors[t.type]} animate-in slide-in-from-right min-w-70 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── useFormAction hook ────────────────────────────────────────────────────── */

export function useFormAction<T>(
  action: (formData: FormData) => Promise<{ success: boolean; data?: T; error?: string }>,
) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      setError(null);
      startTransition(async () => {
        const result = await action(formData);
        if (!result.success) {
          setError(result.error || "Something went wrong");
          toast(result.error || "Something went wrong", "error");
        } else {
          toast("Saved successfully", "success");
        }
      });
    },
    [action],
  );

  return { isPending, error, handleSubmit };
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */

import { clsx } from "clsx";

interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={clsx("border-b border-gray-200 dark:border-gray-700", className)}>
      <nav className="-mb-px flex gap-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={clsx(
              "flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-xs",
                  activeTab === tab.key
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
