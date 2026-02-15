// comments/sanitization.ts
// XSS prevention utilities — depends on sanitize-html

import sanitizeHtml from 'sanitize-html';

export class Sanitize {
  static html(html: string): string {
    if (!html) return '';
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
        'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'span', 'div', 'section', 'article',
      ],
      allowedAttributes: {
        a: ['href', 'title', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        '*': ['class', 'id', 'aria-label', 'aria-hidden', 'role', 'data-*'],
      },
      allowedSchemes: ['http', 'https', 'mailto', 'tel'],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName: string, attribs: Record<string, string>) => {
          if (attribs.target === '_blank') {
            const rel = attribs.rel || 'noopener noreferrer';
            return { tagName, attribs: { ...attribs, rel } };
          }
          return { tagName, attribs };
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
