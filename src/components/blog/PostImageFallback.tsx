"use client";

/**
 * PostImageFallback — Dynamic gradient placeholder when no featured image exists.
 * Generates a deterministic gradient from the post title, overlays the first letter
 * and an optional category badge.
 */

interface PostImageFallbackProps {
  title: string;
  category?: string;
  /** CSS class for the container */
  className?: string;
}

// Deterministic hash from title → gradient angle + two colour stops
function hashToGradient(title: string): { angle: number; from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  const h1 = Math.abs(hash % 360);
  const h2 = (h1 + 40 + Math.abs((hash >> 8) % 40)) % 360;
  const angle = Math.abs((hash >> 16) % 180);
  return {
    angle,
    from: `hsl(${h1}, 65%, 55%)`,
    to: `hsl(${h2}, 55%, 40%)`,
  };
}

export function PostImageFallback({ title, category, className = "" }: PostImageFallbackProps) {
  const { angle, from, to } = hashToGradient(title);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: `linear-gradient(${angle}deg, ${from}, ${to})` }}
    >
      {/* Large first letter */}
      <span className="text-5xl font-extrabold text-white/30 select-none">
        {title.charAt(0).toUpperCase()}
      </span>

      {/* Category badge overlay */}
      {category && (
        <span className="absolute bottom-2 right-2 rounded-md bg-white/20 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
          {category}
        </span>
      )}
    </div>
  );
}
