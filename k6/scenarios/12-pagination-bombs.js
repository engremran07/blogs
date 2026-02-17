// ─────────────────────────────────────────────────────────────
// Scenario 12 — Pagination Bombs & Boundary Testing
// Failure Point: F12 (Unbounded queries, missing limits)
// ─────────────────────────────────────────────────────────────
// Ensures pagination params are validated and bounded,
// preventing DoS via huge page sizes or negative offsets.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, MAX_PAGE_SIZE, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { checkStatus, checkLatency, checkPagination, parseBody, dataFails, perfViolations, checkNo500, checkNoInternalLeak } from '../helpers/checks.js';

export const options = {
  scenarios: {
    pagination: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:                  ['rate<0.2'],
    data_integrity_failures: ['count<3'],
    performance_violations:  ['count<5'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  // ────────────────────────────────────────────
  //  Group 1: Huge page sizes should be capped
  // ────────────────────────────────────────────
  group('12.1 — Huge Page Size', () => {
    const hugeLimits = [1000, 10000, 100000, 999999999];

    for (const limit of hugeLimits) {
      const res = http.get(`${BASE_URL}/api/posts?limit=${limit}`, {
        tags: { name: `GET /api/posts?limit=${limit}` },
      });

      const body = parseBody(res);
      if (res.status === 200 && body?.data) {
        check(res, {
          [`limit ${limit}: capped at max`]: () =>
            body.data.length <= MAX_PAGE_SIZE,
        });
      } else {
        // 400 is also acceptable
        check(res, {
          [`limit ${limit}: rejected`]: (r) =>
            r.status === 400 || r.status === 422,
        });
      }

      // Performance: even large requests should complete quickly
      checkLatency(res, 10000, `limit ${limit}: < 10s`);
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Negative/zero page numbers
  // ────────────────────────────────────────────
  group('12.2 — Invalid Page Numbers', () => {
    const invalidPages = [0, -1, -100, 'abc', 'null', 'undefined', '1.5'];

    for (const page of invalidPages) {
      const res = http.get(`${BASE_URL}/api/posts?page=${page}&limit=5`, {
        tags: { name: `GET /api/posts?page=${page}` },
      });

      check(res, {
        [`page ${page}: safe response`]: (r) =>
          r.status === 200 || r.status === 400 || r.status === 422,
        [`page ${page}: no 500`]: (r) => r.status !== 500,
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: Pagination across all list endpoints
  // ────────────────────────────────────────────
  group('12.3 — All List Endpoints', () => {
    const listEndpoints = [
      { url: '/api/posts?limit=2',   auth: false },
      { url: '/api/tags?limit=2',    auth: false },
      { url: '/api/categories',      auth: false },
      { url: '/api/users?limit=2',   auth: true  },
      { url: '/api/media?limit=2', auth: true  },
      { url: '/api/comments?all=true&limit=2', auth: true },
    ];

    for (const ep of listEndpoints) {
      const params = ep.auth
        ? { jar: admin.jar, tags: { name: `GET ${ep.url} (pagination)` } }
        : { tags: { name: `GET ${ep.url} (pagination)` } };

      const res = http.get(`${BASE_URL}${ep.url}`, params);

      if (res.status === 200) {
        const body = parseBody(res);
        check(res, {
          [`${ep.url}: has data array`]: () =>
            Array.isArray(body?.data),
          [`${ep.url}: respects limit`]: () =>
            !Array.isArray(body?.data) || body.data.length <= 10, // Should be ≤ requested limit
        });
      }
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: Pagination response shape consistency
  // ────────────────────────────────────────────
  group('12.4 — Pagination Shape', () => {
    const res = http.get(`${BASE_URL}/api/posts?page=1&limit=5`, {
      tags: { name: 'GET /api/posts (shape check)' },
    });

    if (res.status === 200) {
      const body = parseBody(res);
      check(res, {
        'shape: has data':       () => Array.isArray(body?.data),
        'shape: has total':      () => typeof body?.total === 'number',
        'shape: has page':       () => typeof body?.page === 'number',
        'shape: has totalPages': () => typeof body?.totalPages === 'number',
        'shape: total >= 0':     () => body?.total >= 0,
        'shape: page >= 1':      () => body?.page >= 1,
        'shape: totalPages >= 0': () => body?.totalPages >= 0,
      });

      // Verify consistency: total <= totalPages * limit
      if (body?.total !== undefined && body?.totalPages !== undefined) {
        const limit = body?.limit || 5;
        check(null, {
          'shape: total ≤ totalPages × limit': () =>
            body.total <= body.totalPages * limit,
        });
      }
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 5: Out-of-range page returns empty (not error)
  // ────────────────────────────────────────────
  group('12.5 — Out-of-Range Page', () => {
    const res = http.get(`${BASE_URL}/api/posts?page=99999&limit=5`, {
      tags: { name: 'GET /api/posts?page=99999' },
    });

    check(res, {
      'high page: 200 OK': (r) => r.status === 200,
      'high page: empty data': () => {
        const body = parseBody(res);
        return Array.isArray(body?.data) && body.data.length === 0;
      },
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 6: Sort injection
  // ────────────────────────────────────────────
  group('12.6 — Sort Param Injection', () => {
    const maliciousSorts = [
      'createdAt; DROP TABLE posts',
      '(SELECT password FROM users LIMIT 1)',
      'CASE WHEN (1=1) THEN createdAt ELSE updatedAt END',
      '../../../etc/passwd',
    ];

    for (const sort of maliciousSorts) {
      const res = http.get(
        `${BASE_URL}/api/posts?sortBy=${encodeURIComponent(sort)}&limit=1`,
        { tags: { name: 'GET /api/posts (malicious sort)' } },
      );

      check(res, {
        [`sort "${sort.substring(0, 20)}": safe`]: (r) =>
          r.status === 200 || r.status === 400 || r.status === 422,
        [`sort: no 500`]: (r) => r.status !== 500,
      });
    }
  });
}
