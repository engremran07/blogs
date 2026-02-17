// ─────────────────────────────────────────────────────────────
// Scenario 04 — SQL / NoSQL Injection
// Failure Point: F04 (Injection via unsanitized inputs)
// ─────────────────────────────────────────────────────────────
// Sends SQL/NoSQL injection payloads to every input vector
// and verifies the app doesn't leak DB errors or execute them.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { SQL_PAYLOADS, NOSQL_PAYLOADS, PROTO_POLLUTION_PAYLOADS, uid } from '../helpers/data.js';
import { checkStatus, checkNoSqlLeak, parseBody, injectionLeaks, securityFails, checkNoInternalLeak } from '../helpers/checks.js';

export const options = {
  scenarios: {
    injection: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:           ['rate<0.2'],
    security_failures:['count<1'],
    injection_leaks:  ['count<1'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  const sqlPayload = SQL_PAYLOADS[__VU % SQL_PAYLOADS.length];

  // ────────────────────────────────────────────
  //  Group 1: SQLi in search/query params
  // ────────────────────────────────────────────
  group('04.1 — SQLi in Query Params', () => {
    const targets = [
      `/api/posts?search=${encodeURIComponent(sqlPayload)}`,
      `/api/posts?sortBy=${encodeURIComponent(sqlPayload)}`,
      `/api/posts?categoryId=${encodeURIComponent(sqlPayload)}`,
      `/api/tags?search=${encodeURIComponent(sqlPayload)}`,
      `/api/categories?search=${encodeURIComponent(sqlPayload)}`,
      `/api/comments?postId=${encodeURIComponent(sqlPayload)}`,
      `/api/users?id=${encodeURIComponent(sqlPayload)}`,
    ];

    for (const target of targets) {
      const res = http.get(`${BASE_URL}${target}`, {
        jar: admin.jar,
        tags: { name: `GET ${target.split('?')[0]} (sqli)` },
      });
      checkNoSqlLeak(res, `query: ${target.split('?')[0]}`);
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 2: SQLi in POST body fields
  // ────────────────────────────────────────────
  group('04.2 — SQLi in POST Bodies', () => {
    // Post creation with SQLi in title
    const postRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({
        title:   `SQLi Test ${uid()} ${sqlPayload}`,
        content: `<p>Content with ${sqlPayload}</p>`,
        status:  'DRAFT',
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (sqli)' },
      },
    );
    checkNoSqlLeak(postRes, 'post create');

    const postId = parseBody(postRes)?.data?.id;
    if (postId) {
      // Clean up
      http.del(`${BASE_URL}/api/posts/${postId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/posts (sqli cleanup)' },
      });
    }

    sleep(0.3);

    // Category creation with SQLi
    const catRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify({
        name:        `SQLi Cat ${uid()} ${sqlPayload}`,
        description: sqlPayload,
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/categories (sqli)' },
      },
    );
    checkNoSqlLeak(catRes, 'category create');

    const catId = parseBody(catRes)?.data?.id;
    if (catId) {
      http.del(`${BASE_URL}/api/categories/${catId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/categories (sqli cleanup)' },
      });
    }

    sleep(0.3);

    // Tag creation with SQLi
    const tagRes = http.post(
      `${BASE_URL}/api/tags`,
      JSON.stringify({
        name:        `SQLi Tag ${uid()} ${sqlPayload}`,
        description: sqlPayload,
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/tags (sqli)' },
      },
    );
    checkNoSqlLeak(tagRes, 'tag create');
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 3: SQLi in URL path segments (ID params)
  // ────────────────────────────────────────────
  group('04.3 — SQLi in URL Path', () => {
    const pathPayloads = [
      "1' OR '1'='1",
      "1; DROP TABLE posts;--",
      "' UNION SELECT * FROM users --",
      '1 AND 1=1',
    ];

    for (const p of pathPayloads) {
      const res = http.get(
        `${BASE_URL}/api/posts/${encodeURIComponent(p)}`,
        {
          jar: admin.jar,
          tags: { name: 'GET /api/posts/:id (sqli path)' },
        },
      );
      checkNoSqlLeak(res, `path: ${p.substring(0, 20)}`);
      check(res, {
        'sqli path: safe response': (r) => r.status !== 500,
      });
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 4: SQLi in login credentials
  // ────────────────────────────────────────────
  group('04.4 — SQLi in Login', () => {
    const jar = http.cookieJar();
    const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, { jar });
    let csrf = '';
    try { csrf = JSON.parse(csrfRes.body).csrfToken; } catch (_) {}

    for (const p of SQL_PAYLOADS.slice(0, 3)) {
      const res = http.post(
        `${BASE_URL}/api/auth/callback/credentials`,
        { email: p, password: p, csrfToken: csrf, json: 'true' },
        {
          jar,
          redirects: 5,
          tags: { name: 'POST /api/auth/callback/credentials (sqli)' },
        },
      );
      checkNoSqlLeak(res, 'login sqli');
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 5: NoSQL-ish injection payloads
  // ────────────────────────────────────────────
  group('04.5 — NoSQL Payloads', () => {
    for (const p of NOSQL_PAYLOADS) {
      const res = http.get(
        `${BASE_URL}/api/posts?search=${encodeURIComponent(p)}`,
        {
          jar: admin.jar,
          tags: { name: 'GET /api/posts (nosql)' },
        },
      );
      checkNoSqlLeak(res, `nosql: ${p.substring(0, 20)}`);
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 6: Prototype Pollution via JSON body
  // ────────────────────────────────────────────
  group('04.6 — Prototype Pollution', () => {
    for (const pp of PROTO_POLLUTION_PAYLOADS) {
      const body = typeof pp === 'string' ? pp : JSON.stringify(pp);
      const res = http.post(
        `${BASE_URL}/api/posts`,
        body,
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts (proto pollution)' },
        },
      );
      checkNoSqlLeak(res, 'proto-pollution');
      checkNoInternalLeak(res, 'proto-pollution-leak');
      check(res, {
        'proto pollution: no 500': (r) => r.status !== 500,
      });
    }
  });
}
