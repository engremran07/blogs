// src/features/distribution/server/sanitization.ts

export class Sanitize {
  static text(input: string, maxLength?: number): string {
    let text = input.replace(/<[^>]*>/g, "").trim();
    if (maxLength && text.length > maxLength) {
      text = text.slice(0, maxLength - 1) + "…";
    }
    return text;
  }

  static url(input: string): string {
    try {
      const u = new URL(input);
      if (!["http:", "https:"].includes(u.protocol)) return "";
      return u.toString();
    } catch {
      return "";
    }
  }

  static hashtag(tag: string): string {
    const cleaned = tag.replace(/[^a-zA-Z0-9_]/g, "");
    return cleaned ? `#${cleaned}` : "";
  }

  static hashtags(tags: string[], limit: number): string[] {
    return tags
      .map((t) => Sanitize.hashtag(t))
      .filter(Boolean)
      .slice(0, limit);
  }
}
