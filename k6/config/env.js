// ─────────────────────────────────────────────────────────────
// k6 Environment Configuration — v2
// ─────────────────────────────────────────────────────────────
// Central config. Override via: k6 --env KEY=VALUE
// ─────────────────────────────────────────────────────────────

/** @type {string} Base URL of the application */
export const BASE_URL       = __ENV.BASE_URL       || 'http://localhost:3000';
export const ADMIN_EMAIL    = __ENV.ADMIN_EMAIL    || 'admin@myblog.com';
export const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Aa1357';
export const USER_EMAIL     = __ENV.USER_EMAIL     || 'reader1@myblog.com';
export const USER_PASSWORD  = __ENV.USER_PASSWORD  || 'TestPass123!@';
export const EDITOR_EMAIL   = __ENV.EDITOR_EMAIL   || 'sarah@myblog.com';
export const EDITOR_PASSWORD= __ENV.EDITOR_PASSWORD|| 'TestPass123!@';
export const AUTHOR_EMAIL   = __ENV.AUTHOR_EMAIL   || 'mike@myblog.com';
export const AUTHOR_PASSWORD= __ENV.AUTHOR_PASSWORD|| 'TestPass123!@';
export const CRON_SECRET    = __ENV.CRON_SECRET    || 'local-cron-secret-change-in-prod';

// Rate-limit thresholds (must match middleware config)
export const RATE_LIMIT_MAX    = parseInt(__ENV.RATE_LIMIT_MAX    || '30', 10);
export const RATE_LIMIT_WINDOW = parseInt(__ENV.RATE_LIMIT_WINDOW || '60', 10);

// Pagination limits
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE     = 100;

// Timeouts
export const HTTP_TIMEOUT = __ENV.HTTP_TIMEOUT || '30s';

// Common HTTP params
export const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Security header expectations
export const EXPECTED_HEADERS = {
  'X-Frame-Options':        'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
};

export const REQUIRED_HEADERS = [
  'Content-Security-Policy',
  'X-Frame-Options',
  'X-Content-Type-Options',
  'Strict-Transport-Security',
  'Referrer-Policy',
  'Permissions-Policy',
];

// Public pages to verify headers on
export const PUBLIC_PAGES = ['/', '/blog', '/about', '/contact', '/login', '/register'];

// Public API endpoints
export const PUBLIC_API_ENDPOINTS = [
  '/api/posts?limit=1',
  '/api/categories',
  '/api/tags?limit=1',
  '/api/health',
];
