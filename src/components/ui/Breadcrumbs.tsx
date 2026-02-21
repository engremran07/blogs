"use client";

import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Visual breadcrumb navigation with icons.
 * Uses 🏠 Home icon as first item and chevron separators.
 * Renders both visual breadcrumbs and hidden BreadcrumbList microdata.
 */
export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`mb-6 ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const icon = idx === 0 && !item.icon
            ? <Home className="h-4 w-4 shrink-0" />
            : item.icon;

          return (
            <li key={idx} className="flex items-center gap-1.5">
              {idx > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500" />
              )}
              {isLast || !item.href ? (
                <span className={`flex items-center gap-1 ${isLast ? "font-medium text-gray-900 dark:text-white" : ""}`}>
                  {icon}
                  <span className="max-w-50 truncate">{item.label}</span>
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="flex items-center gap-1 transition-colors hover:text-primary"
                >
                  {icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
