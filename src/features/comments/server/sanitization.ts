// comments/sanitization.ts
// XSS prevention utilities — depends on sanitize-html

import sanitizeHtml from 'sanitize-html';

export class Sanitize {
  /**
   * Sanitize user-provided HTML for comments.
   * SECURITY: Only allow basic formatting tags — no images, iframes, scripts,
   * tables, structural elements, or wildcard attributes.
   */
  static html(html: string): string {
    if (!html) return '';
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 's',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
        'a',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'rel'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName: string, attribs: Record<string, string>) => {
          // Force all links to open safely
          return {
            tagName,
            attribs: {
              ...attribs,
              target: '_blank',
              rel: 'noopener noreferrer nofollow',
            },
          };
        },
      },
    });
  }

  static text(text: string): string {
    if (!text) return '';
    let s = text.replace(/<[^>]*>/g, '');
    s = this.decodeEntities(s);
    return s.trim().replace(/\s+/g, ' ');
  }

  static email(email: string): string | null {
    if (!email) return null;
    const s = email.toLowerCase().trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
  }

  static url(url: string): string | null {
    if (!url) return null;
    const s = url.trim();
    if (!/^https?:\/\//i.test(s)) return null;
    if (/^(javascript|data):/i.test(s)) return null;
    try { new URL(s); return s; } catch { return null; }
  }

  static slug(slug: string): string {
    if (!slug) return '';
    return slug.toLowerCase().trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 200);
  }

  private static decodeEntities(text: string): string {
    const map: Record<string, string> = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
    };
    return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (m) => map[m] || m);
  }
}
