// ─────────────────────────────────────────────────────────────
// Suite: Smoke Test — Quick validation (< 2 min)
// ─────────────────────────────────────────────────────────────
// Runs critical scenarios with minimal VUs to verify the app
// is alive and core functionality works. Use before deployments.
//
//   k6 run k6/suites/smoke.js
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, CRON_SECRET } from '../config/env.js';
import { loginAdmin, getCsrfToken } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, checkSuccess, checkAuthRejected, parseBody, errorRate, apiLatency } from '../helpers/checks.js';

export const options = {
  scenarios: {
    smoke: {
      executor:    'per-vu-iterations',
      vus:         1,
      iterations:  1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:       ['rate<0.1'],
    api_latency:  ['p(95)<5000'],   // 95th percentile under 5s
  },
};

export default function () {
  // ── 1. Health check ───────────────────────────────────
  group('smoke.health', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'GET /api/health' },
    });
    checkStatus(res, 200, 'health: 200');
    const body = parseBody(res);
    check(res, {
      'health: db ok': () => body?.db === 'ok',
    });
  });

  sleep(0.5);

  // ── 2. Auth flow ──────────────────────────────────────
  let admin;
  group('smoke.auth', () => {
    admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    check(admin, {
      'admin login ok': (s) => s.ok === true,
    });
  });

  if (!admin?.ok) {
    console.error('Smoke: admin login failed — aborting');
    return;
  }

  sleep(0.5);

  // ── 3. CRUD: Create post ──────────────────────────────
  let postId;
  group('smoke.crud.create', () => {
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `Smoke Test ${uid()}`, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/posts' },
      },
    );
    checkStatus(res, 201, 'post created');
    postId = parseBody(res)?.data?.id;
  });

  sleep(0.5);

  // ── 4. CRUD: Read post ────────────────────────────────
  group('smoke.crud.read', () => {
    if (!postId) return;
    const res = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: 'GET /api/posts/:id' },
    });
    checkStatus(res, 200, 'post readable');
  });

  sleep(0.5);

  // ── 5. CRUD: Update post ──────────────────────────────
  group('smoke.crud.update', () => {
    if (!postId) return;
    const res = http.patch(
      `${BASE_URL}/api/posts/${postId}`,
      JSON.stringify({ title: `Smoke Updated ${uid()}` }),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'PATCH /api/posts/:id' },
      },
    );
    checkStatus(res, 200, 'post updated');
  });

  sleep(0.5);

  // ── 6. CRUD: Delete post ──────────────────────────────
  group('smoke.crud.delete', () => {
    if (!postId) return;
    const res = http.del(`${BASE_URL}/api/posts/${postId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/posts/:id' },
    });
    checkStatus(res, 200, 'post deleted');
  });

  sleep(0.5);

  // ── 7. Public listing ─────────────────────────────────
  group('smoke.public', () => {
    const endpoints = [
      '/api/posts?limit=2',
      '/api/categories',
      '/api/tags?limit=2',
    ];
    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep}`, {
        tags: { name: `GET ${ep}` },
      });
      checkStatus(res, 200, `${ep}: 200`);
    }
  });

  sleep(0.5);

  // ── 8. Auth rejection ─────────────────────────────────
  group('smoke.auth_reject', () => {
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost()),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/posts (unauth)' },
      },
    );
    checkAuthRejected(res, 'unauth rejected');
  });

  sleep(0.5);

  // ── 9. SEO endpoint ───────────────────────────────────
  group('smoke.seo', () => {
    const res = http.get(`${BASE_URL}/api/seo?action=overview`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=overview' },
    });
    checkStatus(res, 200, 'seo overview: 200');
  });

  console.log('✓ Smoke test complete');
}
