import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-8xl font-bold text-gray-200 dark:text-gray-800">
        404
      </h1>
      <h2 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Page Not Found
      </h2>
      <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Go Home
      </Link>
    </div>
  );
}
