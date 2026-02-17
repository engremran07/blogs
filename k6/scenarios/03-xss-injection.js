// ─────────────────────────────────────────────────────────────
// Scenario 03 — XSS / Script Injection
// Failure Point: F03 (Stored XSS via user content)
// ─────────────────────────────────────────────────────────────
// Injects XSS payloads into every user-writable field and
// verifies they are sanitized on retrieval.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, makePage, makeCategory, makeTag, XSS_PAYLOADS, CRLF_PAYLOADS, SSTI_PAYLOADS, uid } from '../helpers/data.js';
import {
  checkStatus, checkSuccess, checkNoPayloadReflection,
  parseBody, xssLeaks, securityFails, errorRate, checkNo500, checkNoInternalLeak,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    xss: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:            ['rate<0.2'],
    security_failures: ['count<1'],
    xss_payload_leaks: ['count<1'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    console.error('Admin login failed');
    return;
  }

  const payload = XSS_PAYLOADS[__VU % XSS_PAYLOADS.length];

  // ────────────────────────────────────────────
  //  Group 1: XSS in Post fields
  // ────────────────────────────────────────────
  group('03.1 — XSS in Post', () => {
    const post = makePost({
      title:   `XSS Test ${uid()} ${payload}`,
      content: `<p>Normal text</p>${payload}<p>more text</p>`,
      excerpt: `Excerpt ${payload}`,
    });

    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(post),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (xss)' },
      },
    );

    const created = parseBody(createRes);
    const postId = created?.data?.id;
    if (!postId) return;

    sleep(0.5);

    // Read back and verify sanitization
    const getRes = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: `GET /api/posts/${postId} (xss verify)` },
    });

    checkNoPayloadReflection(getRes, [payload], 'post: xss sanitized');

    // Also check that script tags specifically are stripped
    const body = getRes.body || '';
    check(getRes, {
      'post: no <script> tag': () => !body.toLowerCase().includes('<script'),
      'post: no onerror attr': () => !body.toLowerCase().includes('onerror='),
      'post: no onload attr':  () => !body.toLowerCase().includes('onload='),
      'post: no javascript:':  () => !body.toLowerCase().includes('javascript:'),
    });

    // Cleanup
    http.del(`${BASE_URL}/api/posts/${postId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/posts (xss cleanup)' },
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 2: XSS in Page fields
  // ────────────────────────────────────────────
  group('03.2 — XSS in Page', () => {
    const page = makePage({
      title:   `XSS Page ${uid()} ${payload}`,
      content: `<p>Content</p>${payload}`,
    });

    const createRes = http.post(
      `${BASE_URL}/api/pages`,
      JSON.stringify(page),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/pages (xss)' },
      },
    );

    const created = parseBody(createRes);
    const pageId = created?.data?.id;
    if (!pageId) return;

    sleep(0.5);

    const getRes = http.get(`${BASE_URL}/api/pages/${pageId}`, {
      tags: { name: `GET /api/pages/${pageId} (xss verify)` },
    });
    checkNoPayloadReflection(getRes, [payload], 'page: xss sanitized');

    http.del(`${BASE_URL}/api/pages/${pageId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/pages (xss cleanup)' },
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 3: XSS in Category/Tag names
  // ────────────────────────────────────────────
  group('03.3 — XSS in Category', () => {
    const cat = makeCategory({
      name:        `XSS Cat ${uid()} ${payload}`,
      description: `Desc ${payload}`,
    });

    const createRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify(cat),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/categories (xss)' },
      },
    );

    const created = parseBody(createRes);
    const catId = created?.data?.id;
    if (!catId) return;

    sleep(0.3);

    const getRes = http.get(`${BASE_URL}/api/categories/${catId}`, {
      tags: { name: `GET /api/categories/${catId} (xss verify)` },
    });
    checkNoPayloadReflection(getRes, [payload], 'category: xss sanitized');

    http.del(`${BASE_URL}/api/categories/${catId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/categories (xss cleanup)' },
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 4: XSS in Comment (guest comment)
  // ────────────────────────────────────────────
  group('03.4 — XSS in Comment', () => {
    // Get a published post to comment on
    const listRes = http.get(`${BASE_URL}/api/posts?limit=1&status=PUBLISHED`, {
      tags: { name: 'GET /api/posts (find target)' },
    });
    const posts = parseBody(listRes);
    const targetPostId = posts?.data?.[0]?.id;
    if (!targetPostId) {
      console.warn('No published post for comment XSS test');
      return;
    }

    const commentRes = http.post(
      `${BASE_URL}/api/comments`,
      JSON.stringify({
        postId:      targetPostId,
        content:     `Comment with XSS: ${payload}`,
        authorName:  `XSS <script>alert(1)</script> User`,
        authorEmail: 'xss@test.local',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/comments (xss)' },
      },
    );

    // Comment may be auto-moderated; check that stored version is clean
    const commentBody = parseBody(commentRes);
    if (commentBody?.data?.id) {
      const getRes = http.get(
        `${BASE_URL}/api/comments?postId=${targetPostId}&limit=50`,
        { tags: { name: 'GET /api/comments (xss verify)' } },
      );
      checkNoPayloadReflection(getRes, [payload], 'comment: xss sanitized');
    }
  });

  // ────────────────────────────────────────────
  //  Group 5: XSS in Search/Query params
  // ────────────────────────────────────────────
  group('03.5 — XSS in Query Params', () => {
    const encodedPayload = encodeURIComponent(payload);
    const endpoints = [
      `/api/posts?search=${encodedPayload}`,
      `/api/categories?search=${encodedPayload}`,
      `/api/tags?search=${encodedPayload}`,
    ];

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep}`, {
        tags: { name: `GET ${ep.split('?')[0]} (xss query)` },
      });
      checkNoPayloadReflection(res, [payload], `query xss: ${ep.split('?')[0]}`);
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 6: CRLF Injection
  // ────────────────────────────────────────────
  group('03.6 — CRLF Injection', () => {
    for (const crlf of CRLF_PAYLOADS) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(makePost({ title: `CRLF ${uid()} ${crlf}` })),
        { jar: admin.jar, headers: JSON_HEADERS },
      );
      checkNo500(res, 'crlf-post');
      checkNoInternalLeak(res, 'crlf-leak');

      const postId = parseBody(res)?.data?.id;
      if (postId) http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: admin.jar });
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 7: SSTI Payloads
  // ────────────────────────────────────────────
  group('03.7 — SSTI Payloads', () => {
    for (const ssti of SSTI_PAYLOADS) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(makePost({ title: `SSTI ${uid()}`, content: `<p>${ssti}</p>` })),
        { jar: admin.jar, headers: JSON_HEADERS },
      );
      const body = (res.body || '');
      // Check that template expressions aren't evaluated
      check(res, {
        [`ssti "${ssti.substring(0,15)}": not evaluated`]: () =>
          !body.includes('49') || body.includes(ssti), // 7*7=49 shouldn't appear unless raw
      });
      checkNo500(res, `ssti-${ssti.substring(0,10)}`);

      const postId = parseBody(res)?.data?.id;
      if (postId) http.del(`${BASE_URL}/api/posts/${postId}`, null, { jar: admin.jar });
    }
  });
}
