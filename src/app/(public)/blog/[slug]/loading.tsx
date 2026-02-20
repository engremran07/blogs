export default function PostLoading() {
  return (
    <article className="mx-auto max-w-3xl animate-pulse space-y-6 py-8">
      {/* Title */}
      <div className="h-10 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      {/* Meta */}
      <div className="flex gap-4">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      {/* Featured image */}
      <div className="aspect-video w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
      {/* Content lines */}
      {[95, 80, 100, 70, 88, 75, 92, 65, 85, 78, 97, 60].map((w, i) => (
        <div
          key={i}
          className="rounded bg-gray-200 dark:bg-gray-800"
          style={{ height: 16, width: `${w}%` }}
        />
      ))}
    </article>
  );
}
