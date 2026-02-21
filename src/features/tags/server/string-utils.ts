// tags/string-utils.ts
// Shared Levenshtein distance & similarity utilities for tag services.
// Used by TagService (duplicate detection) and AutocompleteService (fuzzy matching).
// Pure functions — zero external dependencies.

/**
 * Compute the Levenshtein (edit) distance between two strings.
 * Returns the minimum number of single-character edits (insertions,
 * deletions, substitutions) needed to transform `a` into `b`.
 */
export function levenshtein(a: string, b: string): number {
  const m: number[][] = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] =
        b[i - 1] === a[j - 1]
          ? m[i - 1][j - 1]
          : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    }
  }
  return m[b.length][a.length];
}

/**
 * Normalised string similarity between two values (0 = completely different,
 * 1 = identical). Case-insensitive comparison.
 */
export function similarity(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 1;
  const len = Math.max(s.length, t.length);
  return 1 - levenshtein(s, t) / len;
}
