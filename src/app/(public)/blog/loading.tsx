export default function BlogLoading() {
  return (
    <div className="animate-pulse space-y-6 py-8">
      <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="h-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
