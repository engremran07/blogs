// ─────────────────────────────────────────────────────────────
// Scenario 01 — Authentication Flow
// Failure Points: F01 (IDOR via sequential IDs — CUIDs mitigate),
//                 F07 (token lifecycle)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD,
  USER_EMAIL, USER_PASSWORD,
  EDITOR_EMAIL, EDITOR_PASSWORD,
  AUTHOR_EMAIL, AUTHOR_PASSWORD,
  JSON_HEADERS,
} from '../config/env.js';
import { login, getCsrfToken, loginAdmin, loginUser, loginEditor, loginAuthor } from '../helpers/auth.js';
import { makeUser } from '../helpers/data.js';
import { checkStatus, checkSuccess, checkAuthRejected, checkNo500, checkNoInternalLeak, errorRate } from '../helpers/checks.js';

export const options = {
  scenarios: {
    auth_flow: {
      executor:   'per-vu-iterations',
      vus:        3,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:              ['rate<0.1'],
    security_failures:   ['count<1'],
    auth_bypass_attempts:['count<1'],
  },
};

export default function () {
  // ────────────────────────────────────────────
  //  Group 1: Unauthenticated access to protected routes
  //  (Run FIRST before any login — jar is clean)
  // ────────────────────────────────────────────
  group('01.1 — Unauth Access to Protected Routes', () => {
    const protectedEndpoints = [
      { method: 'POST',   url: '/api/posts',    body: JSON.stringify({ title: 'test' }), ct: 'application/json' },
      { method: 'PATCH',  url: '/api/users',     body: JSON.stringify({ id: 'fake', role: 'SUPER_ADMIN' }), ct: 'application/json' },
      { method: 'GET',    url: '/api/settings',  body: null, ct: null },
      { method: 'GET',    url: '/api/media',     body: null, ct: null },
      { method: 'DELETE', url: '/api/users?id=fake', body: null, ct: null },
    ];

    for (const ep of protectedEndpoints) {
      const params = { tags: { name: `${ep.method} ${ep.url} (unauth)` } };
      if (ep.ct) params.headers = JSON_HEADERS;

      let res;
      switch (ep.method) {
        case 'POST':
          res = http.post(`${BASE_URL}${ep.url}`, ep.body, params);
          break;
        case 'PATCH':
          res = http.patch(`${BASE_URL}${ep.url}`, ep.body, params);
          break;
        case 'DELETE':
          res = http.del(`${BASE_URL}${ep.url}`, null, params);
          break;
        default:
          res = http.get(`${BASE_URL}${ep.url}`, params);
      }
      checkAuthRejected(res, `unauth: ${ep.method} ${ep.url}`);
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Invalid credentials
  //  (Run BEFORE valid logins — jar has no session cookies yet)
  // ────────────────────────────────────────────
  group('01.2 — Invalid Credentials', () => {
    const jar = http.cookieJar();
    const csrf = getCsrfToken(jar);

    const res = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      { email: 'nobody@invalid.test', password: 'wrong', csrfToken: csrf, json: 'true' },
      { jar, redirects: 5, tags: { name: 'POST /api/auth/callback/credentials (bad)' } },
    );

    // NextAuth may redirect on failure rather than 401
    const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
      jar,
      tags: { name: 'GET /api/auth/session (bad)' },
    });
    let user = null;
    try { user = JSON.parse(sessionRes.body).user || null; } catch (_) {}
    check(sessionRes, {
      'bad login: no session': () => user === null || user === undefined,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: Valid admin login
  // ────────────────────────────────────────────
  group('01.3 — Admin Login', () => {
    const session = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    check(session, {
      'admin login ok':     (s) => s.ok === true,
      'admin has userId':   (s) => s.userId !== null,
      'admin role is admin': (s) =>
        s.role === 'ADMINISTRATOR' || s.role === 'SUPER_ADMIN',
    });

    // Verify admin can access protected endpoint
    if (session.ok) {
      const res = http.get(`${BASE_URL}/api/settings`, {
        jar: session.jar,
        tags: { name: 'GET /api/settings' },
      });
      checkStatus(res, 200, 'admin can access settings');
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: Valid regular user login
  // ────────────────────────────────────────────
  group('01.4 — User Login', () => {
    const session = loginUser(USER_EMAIL, USER_PASSWORD);
    check(session, {
      'user login ok': (s) => s.ok === true,
    });

    // Regular user must NOT access admin settings
    if (session.ok) {
      const res = http.get(`${BASE_URL}/api/settings`, {
        jar: session.jar,
        tags: { name: 'GET /api/settings (user)' },
      });
      checkAuthRejected(res, 'user blocked from settings');
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 5: Session-token format (CUID, not sequential)
  // ────────────────────────────────────────────
  group('01.5 — ID Format Verification', () => {
    const session = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (session.ok && session.userId) {
      const isCuid = /^c[a-z0-9]{20,}$/.test(session.userId);
      check(session, {
        'user ID is CUID format': () => isCuid,
        'user ID is NOT sequential int': () => !/^\d+$/.test(session.userId),
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 6: Editor & Author Login
  // ────────────────────────────────────────────
  group('01.6 — Editor & Author Login', () => {
    const editor = loginEditor(EDITOR_EMAIL, EDITOR_PASSWORD);
    check(editor, {
      'editor login ok':   (s) => s.ok === true,
      'editor role valid': (s) => s.role === 'EDITOR',
    });

    const author = loginAuthor(AUTHOR_EMAIL, AUTHOR_PASSWORD);
    check(author, {
      'author login ok':   (s) => s.ok === true,
      'author role valid': (s) => s.role === 'AUTHOR',
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 7: No Internal Leaks on Errors
  // ────────────────────────────────────────────
  group('01.7 — Error Response Safety', () => {
    const errorUrls = [
      '/api/posts/nonexistent-id-12345',
      '/api/users?id=bad',
      '/api/settings',  // unauth
    ];

    for (const url of errorUrls) {
      const res = http.get(`${BASE_URL}${url}`);
      checkNo500(res, `error-${url}`);
      checkNoInternalLeak(res, `leak-${url}`);
    }
  });
}
