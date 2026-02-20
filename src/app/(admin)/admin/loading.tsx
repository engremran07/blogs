export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-lg bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
      <div className="h-96 rounded-lg bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
