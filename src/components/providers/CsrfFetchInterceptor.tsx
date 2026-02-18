"use client";

import { useEffect } from "react";

/**
 * Global fetch interceptor that automatically attaches the CSRF token header
 * to all same-origin mutation requests (POST, PUT, PATCH, DELETE).
 *
 * Reads the `csrf_token` cookie (set by proxy.ts with httpOnly: false)
 * and adds it as the `x-csrf-token` header. This eliminates the need to
 * modify every individual fetch() call.
 *
 * Mount once in the root Providers component.
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function CsrfFetchInterceptor() {
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = function csrfFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      // Only intercept same-origin /api/ mutations
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      const method = (init?.method ?? "GET").toUpperCase();

      const isMutation = MUTATION_METHODS.has(method);
      const isApiRoute = url.startsWith("/api/") || url.includes("/api/");

      if (isMutation && isApiRoute) {
        const token = getCsrfToken();
        if (token) {
          const headers = new Headers(init?.headers);
          // Don't overwrite if explicitly set
          if (!headers.has("x-csrf-token")) {
            headers.set("x-csrf-token", token);
          }
          init = { ...init, headers };
        }
      }

      return originalFetch.call(window, input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
