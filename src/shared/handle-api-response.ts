/**
 * Safely handles a fetch Response — checks res.ok, parses JSON.
 * Returns a discriminated union for type-safe consumption.
 */
export async function handleApiResponse<T>(
  res: Response,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  if (!res.ok) {
    const text = await res.text().catch(() => "Unknown error");
    return { success: false, error: text };
  }
  try {
    const data = (await res.json()) as T;
    return { success: true, data };
  } catch {
    return { success: false, error: "Invalid JSON response" };
  }
}
