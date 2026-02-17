// ─────────────────────────────────────────────────────────────
// Scenario 09 — Role-Based Access Control (RBAC)
// Failure Point: F09 (Privilege escalation, broken access control)
// ─────────────────────────────────────────────────────────────
// Tests the full role hierarchy:
//   SUBSCRIBER < AUTHOR < EDITOR < ADMINISTRATOR < SUPER_ADMIN
// Each role should only access endpoints at their permission level.
// Uses all four seed users for comprehensive coverage.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD,
  EDITOR_EMAIL, EDITOR_PASSWORD,
  AUTHOR_EMAIL, AUTHOR_PASSWORD,
  USER_EMAIL, USER_PASSWORD,
  CRON_SECRET, JSON_HEADERS,
} from '../config/env.js';
import { loginAdmin, loginUser, loginEditor, loginAuthor, clearDefaultJar } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, checkAuthRejected, parseBody, securityFails, checkNo500 } from '../helpers/checks.js';

/* ── helpers ─────────────────────────────────────────────── */
function fire(method, url, body, jar) {
  const opts = {
    jar,
    headers: body ? JSON_HEADERS : {},
    tags: { name: `${method} ${url}` },
  };
  switch (method) {
    case 'GET':    return http.get(`${BASE_URL}${url}`, opts);
    case 'POST':   return http.post(`${BASE_URL}${url}`, body, opts);
    case 'PATCH':  return http.patch(`${BASE_URL}${url}`, body, opts);
    case 'PUT':    return http.put(`${BASE_URL}${url}`, body, opts);
    case 'DELETE': return http.del(`${BASE_URL}${url}`, null, opts);
    default:       return http.get(`${BASE_URL}${url}`, opts);
  }
}

export const options = {
  scenarios: {
    rbac: {
      executor:   'per-vu-iterations',
      vus:        1,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:            ['rate<0.2'],
    security_failures: ['count<1'],
  },
};

export default function () {
  // ── Login all four seed users ──────────────────────────
  const admin  = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  const editor = loginEditor(EDITOR_EMAIL, EDITOR_PASSWORD);
  const author = loginAuthor(AUTHOR_EMAIL, AUTHOR_PASSWORD);
  const sub    = loginUser(USER_EMAIL, USER_PASSWORD);

  if (!admin.ok) { console.error('Admin login failed — aborting S09'); return; }
  if (!editor.ok) console.warn('Editor login failed — some tests skipped');
  if (!author.ok) console.warn('Author login failed — some tests skipped');
  if (!sub.ok)    console.warn('Subscriber login failed — some tests skipped');

  // ════════════════════════════════════════════════════════
  //  09.1 — Admin-Only Endpoints (settings, user management)
  // ════════════════════════════════════════════════════════
  group('09.1 — Admin-Only Endpoints', () => {
    const endpoints = [
      { m: 'GET',    url: '/api/settings' },
      { m: 'PATCH',  url: '/api/settings', body: JSON.stringify({ siteName: 'k6-rbac-test' }) },
      { m: 'PATCH',  url: '/api/users',    body: JSON.stringify({ id: 'fake-cuid', role: 'EDITOR' }) },
      { m: 'DELETE', url: '/api/users?id=fake-cuid' },
    ];

    for (const ep of endpoints) {
      // Admin — should succeed (or 404 for fake IDs, never 401/403)
      const adminRes = fire(ep.m, ep.url, ep.body, admin.jar);
      check(adminRes, {
        [`admin → ${ep.m} ${ep.url} ≠ 401/403`]: (r) => r.status !== 401 && r.status !== 403,
      });

      // Editor — should be blocked from settings mutation & user management
      if (editor.ok) {
        const edRes = fire(ep.m, ep.url, ep.body, editor.jar);
        const blocked = check(edRes, {
          [`editor blocked: ${ep.m} ${ep.url}`]: (r) => r.status === 401 || r.status === 403,
        });
        if (!blocked) securityFails.add(1);
      }

      // Author — should also be blocked
      if (author.ok) {
        const auRes = fire(ep.m, ep.url, ep.body, author.jar);
        const blocked = check(auRes, {
          [`author blocked: ${ep.m} ${ep.url}`]: (r) => r.status === 401 || r.status === 403,
        });
        if (!blocked) securityFails.add(1);
      }

      // Subscriber — should be blocked
      if (sub.ok) {
        const subRes = fire(ep.m, ep.url, ep.body, sub.jar);
        const blocked = check(subRes, {
          [`subscriber blocked: ${ep.m} ${ep.url}`]: (r) => r.status === 401 || r.status === 403,
        });
        if (!blocked) securityFails.add(1);
      }
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.2 — Editor+ Endpoints (SEO, admin comments, categories)
  // ════════════════════════════════════════════════════════
  group('09.2 — Editor+ Endpoints', () => {
    const editorEndpoints = [
      '/api/seo?action=overview',
      '/api/comments?all=true&limit=3',
    ];

    for (const url of editorEndpoints) {
      // Admin — allowed
      check(http.get(`${BASE_URL}${url}`, { jar: admin.jar }), {
        [`admin → ${url} OK`]: (r) => r.status === 200,
      });

      // Editor — allowed
      if (editor.ok) {
        check(http.get(`${BASE_URL}${url}`, { jar: editor.jar }), {
          [`editor → ${url} OK`]: (r) => r.status === 200,
        });
      }

      // Author — should be blocked from SEO overview
      if (author.ok) {
        const auRes = http.get(`${BASE_URL}${url}`, { jar: author.jar });
        // Authors may access comments but not SEO overview
        if (url.includes('/api/seo')) {
          const blocked = check(auRes, {
            [`author blocked: ${url}`]: (r) => r.status === 401 || r.status === 403,
          });
          if (!blocked) securityFails.add(1);
        }
      }

      // Subscriber — always blocked
      if (sub.ok) {
        const subRes = http.get(`${BASE_URL}${url}`, { jar: sub.jar });
        const blocked = check(subRes, {
          [`subscriber blocked: ${url}`]: (r) => r.status === 401 || r.status === 403,
        });
        if (!blocked) securityFails.add(1);
      }
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.3 — Author Permission Boundaries
  // ════════════════════════════════════════════════════════
  group('09.3 — Author Permission Boundaries', () => {
    // Admin creates a post
    const adminPost = makePost({ status: 'DRAFT' });
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(adminPost),
      { jar: admin.jar, headers: JSON_HEADERS },
    );
    const postId = parseBody(createRes)?.data?.id;

    // Author creates their own post
    let authorPostId = null;
    if (author.ok) {
      const auPost = makePost({ status: 'DRAFT' });
      const auCreate = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(auPost),
        { jar: author.jar, headers: JSON_HEADERS },
      );
      authorPostId = parseBody(auCreate)?.data?.id;

      check(auCreate, {
        'author can create post': (r) => r.status === 200 || r.status === 201,
      });
    }

    // Author should NOT delete admin's post
    if (author.ok && postId) {
      const delRes = http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: author.jar });
      const blocked = check(delRes, {
        'author cannot delete admin post': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }

    // Subscriber should NOT create posts
    if (sub.ok) {
      const subPost = makePost({ status: 'DRAFT' });
      const subCreate = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(subPost),
        { jar: sub.jar, headers: JSON_HEADERS },
      );
      const blocked = check(subCreate, {
        'subscriber cannot create post': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }

    // Subscriber should NOT delete any post
    if (sub.ok && postId) {
      const delRes = http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: sub.jar });
      const blocked = check(delRes, {
        'subscriber cannot delete post': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }

    // ── Cleanup ──
    if (postId) http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: admin.jar });
    if (authorPostId) http.del(`${BASE_URL}/api/posts/${authorPostId}`, null, { jar: admin.jar });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.4 — Category / Tag Management (Editor+)
  // ════════════════════════════════════════════════════════
  group('09.4 — Category/Tag Write Access', () => {
    const catBody = JSON.stringify(makeCategory());

    // Editor — should be able to create category
    if (editor.ok) {
      const res = http.post(`${BASE_URL}/api/categories`, catBody, {
        jar: editor.jar, headers: JSON_HEADERS,
      });
      check(res, {
        'editor can create category': (r) => r.status === 200 || r.status === 201,
      });
      const catId = parseBody(res)?.data?.id;
      if (catId) http.del(`${BASE_URL}/api/categories?id=${catId}`, null, { jar: admin.jar });
    }

    // Author — should be blocked from creating categories
    if (author.ok) {
      const res = http.post(`${BASE_URL}/api/categories`, catBody, {
        jar: author.jar, headers: JSON_HEADERS,
      });
      const blocked = check(res, {
        'author blocked: create category': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }

    // Subscriber — should be blocked from creating categories
    if (sub.ok) {
      const res = http.post(`${BASE_URL}/api/categories`, catBody, {
        jar: sub.jar, headers: JSON_HEADERS,
      });
      const blocked = check(res, {
        'subscriber blocked: create category': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.5 — Cron Secret Required
  // ════════════════════════════════════════════════════════
  group('09.5 — Cron Secret Required', () => {
    // Without secret
    const noSec = http.get(`${BASE_URL}/api/cron`);
    check(noSec, {
      'cron: rejected without secret': (r) => r.status === 401 || r.status === 403,
    });

    // Wrong secret
    const wrongSec = http.get(`${BASE_URL}/api/cron`, {
      headers: { 'x-cron-secret': 'wrong-secret-value' },
    });
    check(wrongSec, {
      'cron: rejected with wrong secret': (r) => r.status === 401 || r.status === 403,
    });

    // Admin session does NOT bypass cron secret
    const adminCron = http.get(`${BASE_URL}/api/cron`, { jar: admin.jar });
    check(adminCron, {
      'cron: admin session alone insufficient': (r) => r.status === 401 || r.status === 403,
    });
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.6 — Self-Escalation Prevention
  // ════════════════════════════════════════════════════════
  group('09.6 — Self-Escalation Prevention', () => {
    // Editor tries to promote themselves to SUPER_ADMIN
    if (editor.ok) {
      const res = http.patch(
        `${BASE_URL}/api/users`,
        JSON.stringify({ id: editor.userId || 'self', role: 'SUPER_ADMIN' }),
        { jar: editor.jar, headers: JSON_HEADERS },
      );
      const blocked = check(res, {
        'editor cannot self-escalate to SUPER_ADMIN': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }

    // Subscriber tries admin features via forged role header
    if (sub.ok) {
      const res = http.get(`${BASE_URL}/api/settings`, {
        jar: sub.jar,
        headers: { 'X-Role': 'SUPER_ADMIN', 'X-User-Role': 'SUPER_ADMIN' },
      });
      const blocked = check(res, {
        'forged role header rejected': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }
  });

  sleep(0.5);

  // ════════════════════════════════════════════════════════
  //  09.7 — Public Endpoints Open
  // ════════════════════════════════════════════════════════
  group('09.7 — Public Endpoints Open', () => {
    clearDefaultJar(BASE_URL);

    const publicEndpoints = [
      '/api/posts?limit=1',
      '/api/categories',
      '/api/tags?limit=1',
      '/api/health',
    ];

    for (const ep of publicEndpoints) {
      const res = http.get(`${BASE_URL}${ep}`);
      check(res, { [`public: ${ep} OK`]: (r) => r.status === 200 });
      checkNo500(res, `public-${ep}`);
    }
  });
}
