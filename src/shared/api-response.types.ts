/**
 * ============================================================================
 * MODULE:   shared/api-response.types.ts
 * PURPOSE:  Shared API response envelope types used across all route handlers
 *           and client-side fetch consumers.
 * ============================================================================
 */

/** Discriminated union for every JSON API response. */
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

/** Paginated list response envelope. */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
