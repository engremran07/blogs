// ─────────────────────────────────────────────────────────────
// Scenario 17 — SEO Audit & Meta Generation
// Failure Point: F17 (SEO data quality, meta generation)
// ─────────────────────────────────────────────────────────────
// Tests the SEO overview, single-page audit, bulk audit,
// and meta generation endpoints.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, uid } from '../helpers/data.js';
import { checkStatus, checkSuccess, parseBody, dataFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    seo: {
      executor:   'per-vu-iterations',
      vus:        1,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:                  ['rate<0.3'],
    data_integrity_failures: ['count<3'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  const cleanup = [];

  // Create a test post for auditing
  const testPost = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(makePost({
      title:   `SEO Test Post ${uid()}`,
      content: `<p>This post is for SEO audit testing. It has enough content to generate meaningful SEO analysis and meta tags. The content discusses important topics that would benefit from proper search engine optimization.</p><p>Another paragraph with more content to ensure adequate word count for readability and SEO scoring calculations.</p>`,
      status:  'PUBLISHED',
    })),
    {
      jar: admin.jar,
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /api/posts (seo setup)' },
    },
  );
  const postId = parseBody(testPost)?.data?.id;
  if (postId) cleanup.push(postId);

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 1: SEO Overview
  // ────────────────────────────────────────────
  group('17.1 — SEO Overview', () => {
    const res = http.get(`${BASE_URL}/api/seo?action=overview`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=overview' },
    });

    checkStatus(res, 200, 'seo overview: 200');
    const body = parseBody(res);
    check(res, {
      'seo overview: has data': () => body?.data !== undefined || body?.success !== undefined,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Single Post Audit
  // ────────────────────────────────────────────
  group('17.2 — Single Post Audit', () => {
    if (!postId) return;

    const res = http.get(`${BASE_URL}/api/seo?action=audit-post&id=${postId}`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=audit-post' },
    });

    checkStatus(res, 200, 'post audit: 200');
    const body = parseBody(res);
    check(res, {
      'post audit: has data': () => body?.data !== undefined,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: Bulk Audit
  // ────────────────────────────────────────────
  group('17.3 — Bulk Audit', () => {
    const res = http.get(`${BASE_URL}/api/seo?action=audit-all&type=posts`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=audit-all' },
      timeout: '60s',
    });

    check(res, {
      'bulk audit: 200': (r) => r.status === 200,
      'bulk audit: has data': () => parseBody(res)?.data !== undefined,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: Generate Meta
  // ────────────────────────────────────────────
  group('17.4 — Generate Meta', () => {
    if (!postId) return;

    const res = http.get(`${BASE_URL}/api/seo?action=generate-meta&id=${postId}&type=post`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=generate-meta' },
    });

    check(res, {
      'generate meta: 200': (r) => r.status === 200,
    });
    const body = parseBody(res);
    if (body?.data) {
      check(res, {
        'meta: has title or description': () =>
          body.data.seoTitle !== undefined || body.data.seoDescription !== undefined ||
          body.data.title !== undefined || body.data.description !== undefined,
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 5: Auto-link content
  // ────────────────────────────────────────────
  group('17.5 — Auto-Link Content', () => {
    if (!postId) return;

    const res = http.get(
      `${BASE_URL}/api/seo?action=interlink-apply&id=${postId}&type=post`,
      {
        jar: admin.jar,
        tags: { name: 'GET /api/seo?action=interlink-apply' },
      },
    );

    check(res, {
      'auto-link: 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 6: Bulk auto-link
  // ────────────────────────────────────────────
  group('17.6 — Bulk Auto-Link', () => {
    const res = http.get(`${BASE_URL}/api/seo?action=interlink-all&limit=5`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=interlink-all' },
      timeout: '60s',
    });

    check(res, {
      'bulk auto-link: 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 7: SEO requires auth
  // ────────────────────────────────────────────
  group('17.7 — SEO Requires Auth', () => {
    // Clear cookie jar so this test is truly unauthenticated
    http.cookieJar().clear(BASE_URL);

    const res = http.get(`${BASE_URL}/api/seo?action=overview`, {
      tags: { name: 'GET /api/seo (no auth)' },
    });
    check(res, {
      'seo: rejected without auth': (r) =>
        r.status === 401 || r.status === 403,
    });

    // Restore admin cookies for subsequent groups
    loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 8: Invalid SEO actions
  // ────────────────────────────────────────────
  group('17.8 — Invalid SEO Actions', () => {
    const invalidActions = [
      'nonexistent-action',
      'drop-table',
      '<script>alert(1)</script>',
      '',
    ];

    for (const action of invalidActions) {
      const res = http.get(`${BASE_URL}/api/seo?action=${encodeURIComponent(action)}`, {
        jar: admin.jar,
        tags: { name: 'GET /api/seo (invalid action)' },
      });

      check(res, {
        [`invalid action "${action.substring(0, 15)}": safe`]: (r) =>
          r.status === 400 || r.status === 404 || r.status === 200,
        [`invalid action: no 500`]: (r) => r.status !== 500,
      });
    }
  });

  // ── Cleanup ───────────────────────────────────────────
  for (const id of cleanup) {
    http.del(`${BASE_URL}/api/posts/${id}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE (seo cleanup)' },
    });
    sleep(0.1);
  }
}
