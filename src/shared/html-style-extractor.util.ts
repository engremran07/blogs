/**
 * Extract <style> tags and <link rel="stylesheet"> from uploaded HTML documents.
 * Returns cleaned body content and extracted CSS for separate storage.
 */

/**
 * Parse a full HTML document and extract styles from <head> and body.
 * Preserves external stylesheet references as @import rules.
 * Detects Tailwind CDN usage and includes the import.
 */
export function extractHtmlStyles(rawHtml: string): {
  content: string;
  css: string;
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, "text/html");

  const cssFragments: string[] = [];
  const importUrls: string[] = [];

  // ── Extract <link rel="stylesheet"> from <head> ──
  doc.querySelectorAll('head link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href && /^https?:\/\//i.test(href)) {
      importUrls.push(href);
    }
  });

  // ── Extract <style> tags from <head> ──
  doc.querySelectorAll("head style").forEach((style) => {
    const text = style.textContent?.trim();
    if (text) cssFragments.push(text);
  });

  // ── Detect Tailwind CDN <script> (e.g. cdn.tailwindcss.com) ──
  let hasTailwindCdn = importUrls.some((u) => /tailwind/i.test(u));
  if (!hasTailwindCdn) {
    doc.querySelectorAll("script").forEach((script) => {
      const src = script.getAttribute("src") || "";
      if (/tailwindcss|tailwind/i.test(src)) {
        hasTailwindCdn = true;
      }
    });
  }

  // ── Get body content and extract any <style> inside it ──
  const body = doc.querySelector("body");
  let bodyHtml = body ? body.innerHTML.trim() : rawHtml.trim();

  // Parse body to extract and remove <style> tags from it
  const bodyDoc = parser.parseFromString(
    `<body>${bodyHtml}</body>`,
    "text/html",
  );
  bodyDoc.querySelectorAll("style").forEach((style) => {
    const text = style.textContent?.trim();
    if (text) cssFragments.push(text);
    style.remove();
  });
  // Also extract <link rel="stylesheet"> from body
  bodyDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
    const href = link.getAttribute("href");
    if (href && /^https?:\/\//i.test(href)) {
      if (!importUrls.includes(href)) importUrls.push(href);
      if (/tailwind/i.test(href)) hasTailwindCdn = true;
    }
    link.remove();
  });
  bodyHtml = bodyDoc.body.innerHTML.trim();

  // ── If Tailwind detected but no CSS import for it, add CDN ──
  if (hasTailwindCdn && !importUrls.some((u) => /tailwind.*\.css/i.test(u))) {
    importUrls.unshift(
      "https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css",
    );
  }

  // ── Build combined CSS string ──
  const importLines = importUrls.map((url) => `@import url("${url}");`);
  const css = [...importLines, ...cssFragments].filter(Boolean).join("\n\n");

  return { content: bodyHtml || rawHtml, css };
}
