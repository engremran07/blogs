// ─────────────────────────────────────────────────────────────
// Scenario 22 — Mass Assignment & Prototype Pollution
// Failure Points: F41 (Mass assignment on post create),
//                 F43 (JWT session config), F40 (Open redirect)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD,
  EDITOR_EMAIL, EDITOR_PASSWORD,
  USER_EMAIL, USER_PASSWORD,
  JSON_HEADERS,
} from '../config/env.js';
import { loginAdmin, loginUser, loginEditor, getCsrfToken } from '../helpers/auth.js';
import {
  makePost,
  makeUser,
  PROTO_POLLUTION_PAYLOADS,
  MASS_ASSIGNMENT_FIELDS,
  OPEN_REDIRECT_PAYLOADS,
  uid,
} from '../helpers/data.js';
import {
  checkNo500,
  checkNoInfoLeak,
  checkNoInternalLeak,
  parseBody,
  securityFails,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    massassign: {
      executor:    'per-vu-iterations',
      vus:         1,
      iterations:  1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.2'],
    security_failures: ['count<1'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  // ════════════════════════════════════════════════════════
  //  22.1 — Mass assignment on post creation (F41)
  // ════════════════════════════════════════════════════════
  group('22.1 — Mass Assignment on Post Create', () => {
    const maliciousPayloads = [
      { ...makePost(), authorId: admin.userId, viewCount: 999999 },
      { ...makePost(), published: true, status: 'PUBLISHED', featured: true },
      { ...makePost(), id: 'attacker-controlled-id' },
      { ...makePost(), createdAt: '2020-01-01T00:00:00Z' },
      { ...makePost(), deletedAt: null, deleted: false },
    ];

    for (const payload of maliciousPayloads) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(payload),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts (mass assign)' },
        },
      );

      checkNo500(res, 'mass-assign-post');

      const postId = parseBody(res)?.data?.id;
      if (postId) {
        // Verify assigned fields were NOT applied
        const getRes = http.get(`${BASE_URL}/api/posts/${postId}`, {
          jar: admin.jar,
          tags: { name: 'GET /api/posts (verify mass assign)' },
        });
        const post = parseBody(getRes)?.data;
        if (post) {
          check(null, {
            'mass assign: viewCount not set': () =>
              !post.viewCount || post.viewCount !== 999999,
            'mass assign: id not controlled': () =>
              post.id !== 'attacker-controlled-id',
          });
        }

        // Cleanup
        http.del(`${BASE_URL}/api/posts/${postId}`, null, {
          jar: admin.jar,
          tags: { name: 'DELETE /api/posts (cleanup)' },
        });
      }
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  22.2 — Mass assignment on user update
  // ════════════════════════════════════════════════════════
  group('22.2 — Mass Assignment on User Update', () => {
    const user = loginUser(USER_EMAIL, USER_PASSWORD);
    if (!user.ok || !user.userId) return;

    for (const fields of MASS_ASSIGNMENT_FIELDS) {
      const payload = { id: user.userId, ...fields };
      const res = http.patch(
        `${BASE_URL}/api/users`,
        JSON.stringify(payload),
        {
          jar: user.jar,
          headers: JSON_HEADERS,
          tags: { name: 'PATCH /api/users (mass assign)' },
        },
      );

      // Should be rejected (403) or field should be ignored
      check(res, {
        [`user mass assign ${Object.keys(fields)[0]}: blocked`]: (r) =>
          r.status === 401 || r.status === 403 || r.status === 400 || r.status === 200,
      });

      // If 200, verify role wasn't escalated
      if (res.status === 200) {
        const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
          jar: user.jar,
          tags: { name: 'GET /api/auth/session (verify)' },
        });
        const session = parseBody(sessionRes);
        const ok = check(null, {
          'user role unchanged after mass assign': () =>
            session?.user?.role !== 'SUPER_ADMIN' && session?.user?.role !== 'ADMINISTRATOR',
        });
        if (!ok) securityFails.add(1);
      }
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  22.3 — Prototype pollution via JSON body
  // ════════════════════════════════════════════════════════
  group('22.3 — Prototype Pollution', () => {
    for (const pp of PROTO_POLLUTION_PAYLOADS) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        pp,
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts (proto pollution)' },
        },
      );

      check(res, {
        'proto pollution: no 500': (r) => r.status !== 500,
      });
      checkNoInfoLeak(res, 'proto-pollution');
      checkNo500(res, 'proto-pollution');

      // Cleanup if something was created
      const postId = parseBody(res)?.data?.id;
      if (postId) {
        http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: admin.jar });
      }
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  22.4 — Open redirect via callbackUrl (F40)
  // ════════════════════════════════════════════════════════
  group('22.4 — Open Redirect Test', () => {
    for (const payload of OPEN_REDIRECT_PAYLOADS) {
      // Test login page with malicious callbackUrl
      const res = http.get(
        `${BASE_URL}/login?callbackUrl=${encodeURIComponent(payload)}`,
        {
          redirects: 0,
          tags: { name: 'GET /login (open redirect)' },
        },
      );

      // Should NOT redirect to external URL
      const location = res.headers['Location'] || '';
      check(res, {
        [`redirect ${payload.substring(0, 15)}: no external redirect`]: () =>
          !location.includes('evil.com') && !location.startsWith('javascript:'),
      });
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  22.5 — JWT session verification (F43)
  // ════════════════════════════════════════════════════════
  group('22.5 — Session Cookie Security', () => {
    const admin2 = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin2.ok) return;

    // Extract session cookie attributes
    const cookies = admin2.jar.cookiesForURL(BASE_URL);
    const sessionCookieNames = Object.keys(cookies).filter((k) =>
      k.includes('session') || k.includes('token'),
    );

    check(null, {
      'session: has session cookie': () => sessionCookieNames.length > 0,
    });

    // Verify session endpoint returns proper user data
    const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
      jar: admin2.jar,
      tags: { name: 'GET /api/auth/session (jwt verify)' },
    });
    const sessionBody = parseBody(sessionRes);

    check(sessionRes, {
      'session: returns user':         () => sessionBody?.user !== null,
      'session: no password in response': () =>
        !(sessionRes.body || '').includes('password'),
      'session: no hashedPassword':    () =>
        !(sessionRes.body || '').includes('hashedPassword'),
      'session: has expires':          () =>
        sessionBody?.expires !== undefined,
    });
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  22.6 — Registration with malicious fields
  // ════════════════════════════════════════════════════════
  group('22.6 — Registration Mass Assignment', () => {
    const maliciousRegistrations = [
      { ...makeUser(), role: 'SUPER_ADMIN' },
      { ...makeUser(), isAdmin: true },
      { ...makeUser(), emailVerified: new Date().toISOString() },
    ];

    for (const user of maliciousRegistrations) {
      const res = http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify(user),
        {
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/auth/register (mass assign)' },
        },
      );

      if (res.status === 403) {
        // Registration disabled — skip
        return;
      }

      // If account created, check it's not privileged
      if (res.status === 201 || res.status === 200) {
        const body = parseBody(res);
        check(res, {
          'reg mass assign: not SUPER_ADMIN': () =>
            !body?.data?.role || body.data.role !== 'SUPER_ADMIN',
          'reg mass assign: not ADMINISTRATOR': () =>
            !body?.data?.role || body.data.role !== 'ADMINISTRATOR',
        });
      }
    }
  });
}
