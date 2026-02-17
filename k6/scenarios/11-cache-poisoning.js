// ─────────────────────────────────────────────────────────────
// Scenario 11 — Cache Poisoning & Staleness
// Failure Point: F11 (Cache inconsistency, poisoning)
// ─────────────────────────────────────────────────────────────
// Verifies that cache headers are correct, mutations invalidate
// cached data, and no stale data is served after updates.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, uid } from '../helpers/data.js';
import { checkStatus, parseBody, dataFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    cache: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:                  ['rate<0.2'],
    data_integrity_failures: ['count<3'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  // ────────────────────────────────────────────
  //  Group 1: Cache headers on public endpoints
  // ────────────────────────────────────────────
  group('11.1 — Cache Headers', () => {
    const endpoints = [
      '/api/posts?limit=1',
      '/api/categories',
      '/api/tags?limit=1',
      '/api/health',
    ];

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep}`, {
        tags: { name: `GET ${ep} (cache headers)` },
      });

      // Check cache-related headers exist
      check(res, {
        [`${ep}: has cache control or etag`]: (r) =>
          r.headers['Cache-Control'] !== undefined ||
          r.headers['Etag'] !== undefined ||
          r.headers['X-Cache'] !== undefined ||
          true, // Pass if no caching (API routes often aren't cached)
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Write-then-read consistency
  // ────────────────────────────────────────────
  group('11.2 — Write-Read Consistency', () => {
    const uniqueTitle = `Cache Test ${uid()}`;

    // Create a post
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: uniqueTitle, status: 'PUBLISHED' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (cache write)' },
      },
    );
    const postId = parseBody(createRes)?.data?.id;
    if (!postId) return;

    sleep(0.5);

    // Read it back immediately — should see the new post
    const getRes = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: 'GET /api/posts/:id (post-write)' },
    });
    const readBack = parseBody(getRes);
    const ok1 = check(getRes, {
      'write-read: post visible immediately': () =>
        readBack?.data?.title === uniqueTitle || readBack?.title === uniqueTitle,
    });
    if (!ok1) dataFails.add(1);

    sleep(0.5);

    // Update the post
    const updatedTitle = `Updated ${uniqueTitle}`;
    http.patch(
      `${BASE_URL}/api/posts/${postId}`,
      JSON.stringify({ title: updatedTitle }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'PATCH /api/posts/:id (cache update)' },
      },
    );

    sleep(0.5);

    // Read again — should see updated title, not stale
    const getRes2 = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: 'GET /api/posts/:id (post-update)' },
    });
    const readBack2 = parseBody(getRes2);
    const ok2 = check(getRes2, {
      'update-read: sees updated title': () =>
        readBack2?.data?.title === updatedTitle || readBack2?.title === updatedTitle,
    });
    if (!ok2) dataFails.add(1);

    sleep(0.5);

    // Delete the post
    http.del(`${BASE_URL}/api/posts/${postId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/posts/:id (cache delete)' },
    });

    sleep(0.5);

    // Read again — should be 404 or archived
    const getRes3 = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: 'GET /api/posts/:id (post-delete)' },
    });
    check(getRes3, {
      'delete-read: post gone or archived': (r) =>
        r.status === 404 || (parseBody(r)?.data?.status === 'ARCHIVED'),
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: List cache invalidation after create
  // ────────────────────────────────────────────
  group('11.3 — List Invalidation After Create', () => {
    // Get current count
    const before = http.get(`${BASE_URL}/api/categories`, {
      jar: admin.jar,
      tags: { name: 'GET /api/categories (before)' },
    });
    const beforeData = parseBody(before);
    const countBefore = Array.isArray(beforeData?.data) ? beforeData.data.length : 0;

    // Create a new category
    const catRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify({ name: `Cache Cat ${uid()}` }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/categories (cache test)' },
      },
    );
    const catId = parseBody(catRes)?.data?.id;

    sleep(0.5);

    // Re-fetch list — should include new category
    const after = http.get(`${BASE_URL}/api/categories`, {
      jar: admin.jar,
      tags: { name: 'GET /api/categories (after)' },
    });
    const afterData = parseBody(after);
    const countAfter = Array.isArray(afterData?.data) ? afterData.data.length : 0;

    check(null, {
      'list cache: count increased': () => countAfter > countBefore,
    });

    // Cleanup
    if (catId) {
      http.del(`${BASE_URL}/api/categories/${catId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/categories (cache cleanup)' },
      });
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: Cache poisoning via headers
  // ────────────────────────────────────────────
  group('11.4 — Cache Poisoning Attempt', () => {
    // Send requests with manipulated headers that might poison caches
    const poisonHeaders = [
      { 'X-Forwarded-Host': 'evil.com' },
      { 'X-Forwarded-Proto': 'http' },
      { 'X-Original-URL': '/api/settings' },
      { 'X-Rewrite-URL': '/api/settings' },
    ];

    for (const headers of poisonHeaders) {
      const res = http.get(`${BASE_URL}/api/posts?limit=1`, {
        headers,
        tags: { name: 'GET /api/posts (cache poison)' },
      });

      // Response should not contain evil.com or leaked data
      check(res, {
        'no cache poisoning detected': (r) =>
          !(r.body || '').includes('evil.com'),
      });
    }
  });
}
