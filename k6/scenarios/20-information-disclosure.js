// ─────────────────────────────────────────────────────────────
// Scenario 20 — Information Disclosure
// Failure Points: F31 (Sitemap enumeration), F32 (Robots.txt reveals structure),
//                 F33 (Unknown routes), F34 (Health info disclosure)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL } from '../config/env.js';
import {
  checkNo500,
  checkNoInfoLeak,
  checkNoSensitiveLeaks,
  parseBody,
  infoLeaks,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    infodisc: {
      executor:    'per-vu-iterations',
      vus:         2,
      iterations:  1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.1'],
    information_leaks: ['count<3'],
  },
};

export default function () {
  // ════════════════════════════════════════════════════════
  //  20.1 — Sitemap info-gathering check
  // ════════════════════════════════════════════════════════
  group('20.1 — Sitemap Audit', () => {
    const res = http.get(`${BASE_URL}/sitemap.xml`, {
      tags: { name: 'GET /sitemap.xml' },
    });

    check(res, {
      'sitemap: accessible':    (r) => r.status === 200,
      'sitemap: is XML':        (r) =>
        (r.headers['Content-Type'] || '').includes('xml'),
      'sitemap: no admin URLs': () =>
        !(res.body || '').includes('/admin'),
      'sitemap: no API URLs':   () =>
        !(res.body || '').includes('/api/'),
      'sitemap: no login URL':  () =>
        !(res.body || '').includes('/login'),
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  20.2 — Robots.txt analysis
  // ════════════════════════════════════════════════════════
  group('20.2 — Robots.txt Analysis', () => {
    const res = http.get(`${BASE_URL}/robots.txt`, {
      tags: { name: 'GET /robots.txt' },
    });

    check(res, {
      'robots: accessible':       (r) => r.status === 200,
      'robots: disallows /api/':  () =>
        (res.body || '').includes('Disallow: /api/'),
      'robots: disallows /admin': () =>
        (res.body || '').includes('Disallow: /admin'),
      'robots: has sitemap ref':  () =>
        (res.body || '').includes('Sitemap:'),
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  20.3 — Unknown/nonexistent routes
  // ════════════════════════════════════════════════════════
  group('20.3 — Unknown Route Handling', () => {
    const unknownRoutes = [
      '/api/nonexistent',
      '/api/admin/secret',
      '/api/v2/posts',
      '/api/.env',
      '/api/wp-admin',
      '/api/phpinfo',
      '/.env',
      '/.git/config',
      '/wp-login.php',
      '/admin/login',
    ];

    for (const route of unknownRoutes) {
      const res = http.get(`${BASE_URL}${route}`, {
        tags: { name: `GET ${route} (404)` },
        redirects: 0,
      });

      check(res, {
        [`${route}: not 200`]: (r) =>
          r.status === 404 || r.status === 405 || r.status === 307 || r.status === 308,
      });
      checkNoInfoLeak(res, `unknown-${route}`);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  20.4 — Health endpoint info disclosure
  // ════════════════════════════════════════════════════════
  group('20.4 — Health Info Disclosure', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'GET /api/health (infodiscl)' },
    });

    const body = parseBody(res);
    check(res, {
      'health: no version leak':  () =>
        !(res.body || '').includes('"version"'),
      'health: no env leak':      () =>
        !(res.body || '').includes('"NODE_ENV"') &&
        !(res.body || '').includes('"env"'),
      'health: no hostname leak': () =>
        !(res.body || '').includes('"hostname"') &&
        !(res.body || '').includes('"host"'),
      'health: no IP leak':       () =>
        !(res.body || '').match(/\d+\.\d+\.\d+\.\d+/),
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  20.5 — Error responses don't leak internals
  // ════════════════════════════════════════════════════════
  group('20.5 — Error Response Safety', () => {
    const errorTriggers = [
      { url: '/api/posts?page=-1', desc: 'negative page' },
      { url: '/api/posts?limit=999999', desc: 'huge limit' },
      { url: '/api/posts/undefined', desc: 'undefined id' },
      { url: '/api/posts?search=' + 'A'.repeat(5000), desc: 'oversized search' },
    ];

    for (const trigger of errorTriggers) {
      const res = http.get(`${BASE_URL}${trigger.url}`, {
        tags: { name: `GET (error: ${trigger.desc})` },
      });

      checkNoInfoLeak(res, `error-${trigger.desc}`);
      checkNoSensitiveLeaks(res, `sensitive-${trigger.desc}`);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  20.6 — Sensitive file exposure
  // ════════════════════════════════════════════════════════
  group('20.6 — Sensitive File Exposure', () => {
    const sensitiveFiles = [
      '/.env',
      '/.env.local',
      '/.env.production',
      '/api/.env',
      '/.git/HEAD',
      '/.git/config',
      '/package.json',
      '/next.config.js',
      '/prisma/schema.prisma',
      '/tsconfig.json',
    ];

    for (const file of sensitiveFiles) {
      const res = http.get(`${BASE_URL}${file}`, {
        tags: { name: `GET ${file}` },
        redirects: 0,
      });

      const ok = check(res, {
        [`${file}: not directly accessible`]: (r) =>
          r.status === 404 || r.status === 403 || r.status === 307 || r.status === 308,
      });
      if (!ok) {
        // Check if actual file content is served
        const body = (res.body || '').toLowerCase();
        if (body.includes('database_url') || body.includes('secret') ||
            body.includes('[core]') || body.includes('"dependencies"')) {
          infoLeaks.add(1);
          console.error(`SECURITY: Sensitive file ${file} accessible!`);
        }
      }
    }
  });
}
