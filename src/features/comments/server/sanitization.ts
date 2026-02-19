// comments/sanitization.ts
// Comment sanitization — HTML via sanitize-html library, rest delegates to shared.

import sanitizeHtml from 'sanitize-html';
import {
  sanitizeText as _sanitizeText,
  sanitizeEmail as _sanitizeEmail,
  sanitizeUrl as _sanitizeUrl,
  sanitizeSlug as _sanitizeSlug,
} from '@/shared/sanitize.util';

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
    return _sanitizeText(text);
  }

  static email(email: string): string | null {
    return _sanitizeEmail(email);
  }

  static url(url: string): string | null {
    return _sanitizeUrl(url, false);
  }

  static slug(slug: string): string {
    return _sanitizeSlug(slug, 200);
  }
}
