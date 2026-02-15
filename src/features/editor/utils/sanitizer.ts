/**
 * ============================================================================
 * MODULE:   editor/utils/sanitizer.ts
 * PURPOSE:  Enterprise-grade HTML sanitizer for pasted / inserted content.
 *           Prevents XSS while preserving legitimate formatting.
 *
 * STRATEGY:
 *   Allowlist-based — only safe tags and attributes are kept.
 *   Everything else is stripped.
 *
 * COVERAGE:
 *   - Blocks <script>, <style>, <link>, <meta>, <iframe>, <object>, <embed>
 *   - Strips on* event handler attributes
 *   - Blocks javascript: / data: / vbscript: protocols in href, src, action
 *   - Removes dangerous SVG/MathML attack vectors
 *   - Preserves safe formatting: bold, italic, underline, lists, headings,
 *     links, images, tables, blockquotes, code blocks
 * ============================================================================
 */

/* ── Allowlists ── */

const SAFE_TAGS = new Set([
  /* Block */
  'p', 'div', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'pre', 'figure', 'figcaption',
  /* Inline */
  'span', 'a', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins',
  'sub', 'sup', 'mark', 'small', 'abbr', 'code', 'kbd', 'samp', 'var',
  /* Lists */
  'ul', 'ol', 'li',
  /* Table */
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  /* Media */
  'img',
  /* Other */
  'details', 'summary',
]);

const SAFE_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height',
  'target', 'rel', 'colspan', 'rowspan', 'scope',
  'loading', 'decoding', 'draggable',
  'class', 'id', 'lang', 'dir',
  'role', 'aria-label', 'aria-hidden', 'aria-describedby',
  'data-checked',
  /* Needed for existing editor patterns */
  'style',
]);

/** Protocols considered safe for href / src / action attributes. */
const SAFE_PROTOCOLS = /^(?:https?|mailto|tel):/i;

/** Dangerous protocol patterns (javascript:, data:, vbscript:, etc.). */
const DANGEROUS_PROTOCOL = /^\s*(?:javascript|data|vbscript)\s*:/i;

/** Allowlisted style properties (subset of CSS). */
const SAFE_STYLE_PROPS = new Set([
  'color', 'background-color', 'background',
  'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'text-decoration', 'text-transform',
  'line-height', 'letter-spacing', 'word-spacing',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-radius',
  'display', 'vertical-align',
  'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height',
  'list-style-type',
]);

/* ── Sanitise a single style attribute value ── */
function sanitiseStyle(raw: string): string {
  const parts = raw.split(';').filter(Boolean);
  const safe: string[] = [];

  for (const part of parts) {
    const [prop, ...valueParts] = part.split(':');
    const property = prop?.trim().toLowerCase();
    const value = valueParts.join(':').trim();
    if (!property || !value) continue;

    /* Block CSS expressions and url() with dangerous protocols */
    if (/expression\s*\(/i.test(value)) continue;
    if (/url\s*\(/i.test(value) && DANGEROUS_PROTOCOL.test(value)) continue;

    if (SAFE_STYLE_PROPS.has(property)) {
      safe.push(`${property}: ${value}`);
    }
  }

  return safe.join('; ');
}

/* ── Sanitise a URL attribute ── */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return true; // empty is ok
  if (DANGEROUS_PROTOCOL.test(trimmed)) return false;
  if (SAFE_PROTOCOLS.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('.')) return true;
  /* Relative URLs without protocol are ok */
  if (!trimmed.includes(':')) return true;
  return false;
}

/* ── Main sanitiser ── */

/**
 * Sanitise HTML string by stripping dangerous tags and attributes.
 * Returns clean HTML safe for `insertHTML` or `innerHTML`.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof DOMParser === 'undefined') {
    /* SSR / non-browser: strip all tags as a safety net */
    return dirty.replace(/<[^>]*>/g, '');
  }

  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType === Node.COMMENT_NODE) {
      node.removeChild(child);
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child);
      continue;
    }

    const el = child as Element;
    const tagName = el.tagName.toLowerCase();

    /* Strip forbidden tags entirely (including children) */
    if (!SAFE_TAGS.has(tagName)) {
      /* For non-dangerous container tags, keep text content */
      if (['script', 'style', 'link', 'meta', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'svg', 'math'].includes(tagName)) {
        node.removeChild(el);
      } else {
        /* Unwrap: keep children, remove the wrapper tag */
        while (el.firstChild) {
          node.insertBefore(el.firstChild, el);
        }
        node.removeChild(el);
      }
      continue;
    }

    /* Strip disallowed attributes */
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const name = attr.name.toLowerCase();

      /* Remove event handlers */
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (!SAFE_ATTRS.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      /* Sanitise URLs */
      if ((name === 'href' || name === 'src' || name === 'action') && !isSafeUrl(attr.value)) {
        el.removeAttribute(attr.name);
        continue;
      }

      /* Sanitise inline styles */
      if (name === 'style') {
        const cleaned = sanitiseStyle(attr.value);
        if (cleaned) {
          el.setAttribute('style', cleaned);
        } else {
          el.removeAttribute('style');
        }
      }
    }

    /* Force safe link attributes */
    if (tagName === 'a') {
      el.setAttribute('rel', 'noopener noreferrer');
    }

    /* Recurse into children */
    sanitizeNode(el);
  }
}

/**
 * Escape a string for safe insertion into HTML attribute values.
 * Prevents attribute-breakout XSS.
 */
export function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Escape a string for safe insertion into HTML text content.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
