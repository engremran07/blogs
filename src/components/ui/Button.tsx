"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type Size = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm",
  secondary:
    "bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm",
  ghost:
    "text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-400 dark:text-gray-300 dark:hover:bg-gray-800",
  outline:
    "border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
};

const sizeStyles: Record<Size, string> = {
  xs: "px-2 py-1 text-xs gap-1 rounded",
  sm: "px-3 py-1.5 text-sm gap-1.5 rounded-md",
  md: "px-4 py-2 text-sm gap-2 rounded-lg",
  lg: "px-6 py-3 text-base gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      disabled,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
