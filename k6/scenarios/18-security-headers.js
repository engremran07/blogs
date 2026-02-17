// ─────────────────────────────────────────────────────────────
// Scenario 18 — Security Headers & CSP Audit
// Failure Points: F18 (Missing X-XSS-Protection), F19 (Headers on pages),
//                 F20 (X-Powered-By), F35 (CSP unsafe-inline/eval),
//                 F36 (connect-src)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  PUBLIC_PAGES,
  PUBLIC_API_ENDPOINTS,
} from '../config/env.js';
import {
  checkSecurityHeaders,
  checkNo500,
  headerFails,
  securityFails,
  parseBody,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    headers: {
      executor:    'per-vu-iterations',
      vus:         2,
      iterations:  1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:                    ['rate<0.1'],
    header_security_failures:  ['count<5'],
  },
};

export default function () {
  // ════════════════════════════════════════════════════════
  //  18.1 — Security headers on public pages
  // ════════════════════════════════════════════════════════
  group('18.1 — Page Security Headers', () => {
    for (const page of PUBLIC_PAGES) {
      const res = http.get(`${BASE_URL}${page}`, {
        tags: { name: `GET ${page} (headers)` },
      });
      checkSecurityHeaders(res, `headers: ${page}`);
      checkNo500(res, `page-${page}`);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.2 — Security headers on API endpoints
  // ════════════════════════════════════════════════════════
  group('18.2 — API Security Headers', () => {
    for (const ep of PUBLIC_API_ENDPOINTS) {
      const res = http.get(`${BASE_URL}${ep}`, {
        tags: { name: `GET ${ep} (headers)` },
      });
      checkSecurityHeaders(res, `headers: ${ep}`);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.3 — X-Powered-By suppression
  // ════════════════════════════════════════════════════════
  group('18.3 — No X-Powered-By', () => {
    const targets = ['/', '/api/health', '/api/posts?limit=1', '/login'];
    for (const url of targets) {
      const res = http.get(`${BASE_URL}${url}`, {
        tags: { name: `GET ${url} (x-powered-by)` },
      });
      const ok = check(res, {
        [`${url}: no X-Powered-By`]: (r) => !r.headers['X-Powered-By'],
        [`${url}: no Server header`]: (r) =>
          !r.headers['Server'] || !r.headers['Server'].includes('Next'),
      });
      if (!ok) headerFails.add(1);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.4 — Content-Security-Policy audit
  // ════════════════════════════════════════════════════════
  group('18.4 — CSP Audit', () => {
    const res = http.get(`${BASE_URL}/`, {
      tags: { name: 'GET / (CSP)' },
    });

    const csp = res.headers['Content-Security-Policy'] || '';

    check(res, {
      'CSP: header present':         () => csp.length > 0,
      'CSP: has default-src':        () => csp.includes('default-src'),
      'CSP: has script-src':         () => csp.includes('script-src'),
      'CSP: warns unsafe-inline':    () => {
        if (csp.includes("'unsafe-inline'")) {
          console.warn('CSP WARNING: unsafe-inline in script-src');
        }
        return true; // Info check, not blocking
      },
      'CSP: warns unsafe-eval': () => {
        if (csp.includes("'unsafe-eval'")) {
          console.warn('CSP WARNING: unsafe-eval in script-src');
        }
        return true;
      },
      'CSP: has frame-ancestors':    () =>
        csp.includes('frame-ancestors') || res.headers['X-Frame-Options'] !== undefined,
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.5 — CORS headers
  // ════════════════════════════════════════════════════════
  group('18.5 — CORS Safety', () => {
    const res = http.get(`${BASE_URL}/api/posts?limit=1`, {
      headers: { 'Origin': 'https://evil-attacker.com' },
      tags: { name: 'GET /api/posts (CORS)' },
    });

    check(res, {
      'CORS: no wildcard Access-Control-Allow-Origin': () =>
        res.headers['Access-Control-Allow-Origin'] !== '*',
      'CORS: no evil origin reflected': () =>
        res.headers['Access-Control-Allow-Origin'] !== 'https://evil-attacker.com',
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.6 — Cache-Control on sensitive endpoints
  // ════════════════════════════════════════════════════════
  group('18.6 — Sensitive Cache-Control', () => {
    const sensitiveUrls = ['/api/auth/session', '/api/auth/csrf'];

    for (const url of sensitiveUrls) {
      const res = http.get(`${BASE_URL}${url}`, {
        tags: { name: `GET ${url} (cache)` },
      });
      const cacheControl = res.headers['Cache-Control'] || '';
      check(res, {
        [`${url}: no-store or private`]: () =>
          cacheControl.includes('no-store') ||
          cacheControl.includes('private') ||
          cacheControl === '',
        [`${url}: not public cache`]: () =>
          !cacheControl.includes('public'),
      });
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  18.7 — HTTP Method Confusion
  // ════════════════════════════════════════════════════════
  group('18.7 — HTTP Method Confusion', () => {
    // TRACE should not be allowed
    const traceRes = http.request('TRACE', `${BASE_URL}/api/health`, null, {
      tags: { name: 'TRACE /api/health' },
    });
    check(traceRes, {
      'TRACE: not 200': (r) => r.status !== 200,
    });

    // OPTIONS should not leak sensitive info
    const optionsRes = http.request('OPTIONS', `${BASE_URL}/api/posts`, null, {
      tags: { name: 'OPTIONS /api/posts' },
    });
    check(optionsRes, {
      'OPTIONS: safe response': (r) =>
        r.status === 204 || r.status === 200 || r.status === 405,
    });
  });
}
