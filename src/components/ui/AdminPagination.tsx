"use client";

/** Unified page size for all admin list views. */
export const ADMIN_PAGE_SIZE = 20;

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

/**
 * Shared admin pagination: "Showing X–Y of Z" + Prev / numbered-with-ellipsis / Next.
 * Renders nothing when totalPages <= 1.
 */
export function AdminPagination({ page, totalPages, total, pageSize = ADMIN_PAGE_SIZE, onPageChange }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
      if (i > 0 && arr[i - 1] !== p - 1) acc.push("ellipsis");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                page === p
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ),
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded px-3 py-1.5 text-sm font-medium disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}
