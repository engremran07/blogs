// ─────────────────────────────────────────────────────────────
// Scenario 06 — CSRF Validation
// Failure Point: F06 (CSRF on state-changing endpoints)
// ─────────────────────────────────────────────────────────────
// Tests whether state-changing operations require valid CSRF
// tokens or session cookies, preventing cross-site forgery.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin, getCsrfToken } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, parseBody, securityFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    csrf: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.2'],
    security_failures: ['count<1'],
  },
};

export default function () {
  // ────────────────────────────────────────────
  //  Group 1: Mutations without session cookies
  // ────────────────────────────────────────────
  group('06.1 — Mutations Without Cookies', () => {
    // These should all fail (401/403) because no session cookie
    const targets = [
      {
        method: 'POST',
        url:    '/api/posts',
        body:   JSON.stringify(makePost()),
      },
      {
        method: 'POST',
        url:    '/api/categories',
        body:   JSON.stringify(makeCategory()),
      },
      {
        method: 'PATCH',
        url:    '/api/users',
        body:   JSON.stringify({ id: 'fake', role: 'EDITOR' }),
      },
    ];

    for (const t of targets) {
      const params = {
        headers: JSON_HEADERS,
        tags: { name: `${t.method} ${t.url} (no cookies)` },
      };

      let res;
      if (t.method === 'POST') {
        res = http.post(`${BASE_URL}${t.url}`, t.body, params);
      } else {
        res = http.patch(`${BASE_URL}${t.url}`, t.body, params);
      }

      const ok = check(res, {
        [`no-cookie: ${t.method} ${t.url} rejected`]: (r) =>
          r.status === 401 || r.status === 403,
      });
      if (!ok) securityFails.add(1);
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Mutations with forged/invalid session cookie
  // ────────────────────────────────────────────
  group('06.2 — Forged Session Cookie', () => {
    const forgedCookies = [
      'authjs.session-token=forged-invalid-jwt-token-12345',
      'authjs.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    ];

    for (const cookie of forgedCookies) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(makePost()),
        {
          headers: {
            ...JSON_HEADERS,
            Cookie: cookie,
          },
          tags: { name: 'POST /api/posts (forged cookie)' },
        },
      );

      const ok = check(res, {
        'forged cookie: rejected': (r) =>
          r.status === 401 || r.status === 403,
      });
      if (!ok) securityFails.add(1);
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: Valid session can perform mutations
  // ────────────────────────────────────────────
  group('06.3 — Valid Session Succeeds', () => {
    const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin.ok) return;

    const cat = makeCategory();
    const res = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify(cat),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/categories (valid session)' },
      },
    );

    check(res, {
      'valid session: 201': (r) => r.status === 201,
    });

    // Cleanup
    const catId = parseBody(res)?.data?.id;
    if (catId) {
      http.del(`${BASE_URL}/api/categories/${catId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/categories (cleanup)' },
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: NextAuth CSRF token flow
  // ────────────────────────────────────────────
  group('06.4 — CSRF Token Endpoint', () => {
    const jar = http.cookieJar();
    const csrfToken = getCsrfToken(jar);

    check(null, {
      'csrf token is non-empty':    () => csrfToken.length > 0,
      'csrf token is not trivial':  () => csrfToken.length > 10,
    });

    // Login without CSRF token should fail or behave differently
    const res = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      {
        email:    ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        // intentionally omitting csrfToken
        json: 'true',
      },
      {
        jar,
        redirects: 5,
        tags: { name: 'POST /api/auth/callback/credentials (no csrf)' },
      },
    );

    // NextAuth should reject or not authenticate without CSRF
    const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
      jar,
      tags: { name: 'GET /api/auth/session (no csrf login)' },
    });
    const body = parseBody(sessionRes);
    check(sessionRes, {
      'login without csrf: no valid session': () =>
        !body?.user || body?.user === null,
    });
  });
}
