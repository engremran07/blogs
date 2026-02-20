export default function TagsLoading() {
  return (
    <div className="animate-pulse space-y-6 py-8">
      <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex flex-wrap gap-3">
        {[95, 72, 130, 88, 110, 65, 140, 78, 100, 85, 120, 68, 105, 90, 75, 135, 82, 115, 70, 98].map((w, i) => (
          <div
            key={i}
            className="h-9 rounded-full bg-gray-200 dark:bg-gray-800"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}
