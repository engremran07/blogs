// ─────────────────────────────────────────────────────────────
// Scenario 19 — Access Control Gaps
// Failure Points: F25 (Draft posts via ID without auth),
//                 F26 (?all=true bypasses PUBLISHED filter),
//                 F27 (Ad slots readable by any user),
//                 F37 (Posts bulk action lacks validation)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD,
  USER_EMAIL, USER_PASSWORD,
  JSON_HEADERS,
} from '../config/env.js';
import { loginAdmin, loginUser } from '../helpers/auth.js';
import { makePost, uid } from '../helpers/data.js';
import {
  checkStatus,
  checkAuthRejected,
  checkNo500,
  parseBody,
  securityFails,
  infoLeaks,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    access: {
      executor:    'per-vu-iterations',
      vus:         2,
      iterations:  1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:              ['rate<0.1'],
    security_failures:   ['count<1'],
    information_leaks:   ['count<1'],
  },
};

export default function () {
  // ── Setup: create a draft post as admin ──────────────
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    console.error('Admin login failed');
    return;
  }

  const draftPost = makePost({ status: 'DRAFT', title: `Draft Secret ${uid()}` });
  const createRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(draftPost),
    {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (draft setup)' },
    },
  );
  const draftId = parseBody(createRes)?.data?.id;

  if (!draftId) {
    console.error('Failed to create draft post');
    return;
  }

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.1 — Draft post accessible by ID without auth (F25)
  // ════════════════════════════════════════════════════════
  group('19.1 — Unauth Access to Draft by ID', () => {
    // Clear cookie jar for a truly unauthenticated request
    http.cookieJar().clear(BASE_URL);

    const res = http.get(`${BASE_URL}/api/posts/${draftId}`, {
      tags: { name: `GET /api/posts/${draftId} (unauth draft)` },
    });

    // Draft should NOT be accessible without authentication
    const body = parseBody(res);
    const ok = check(res, {
      'draft by ID: rejected or empty': (r) =>
        r.status === 401 || r.status === 403 || r.status === 404 ||
        (r.status === 200 && (!body?.data || body?.data?.status !== 'DRAFT')),
    });
    if (!ok) {
      securityFails.add(1);
      infoLeaks.add(1);
      console.error(`SECURITY: Draft post ${draftId} accessible without auth!`);
    }

    // If accessible, verify content is not leaked
    if (res.status === 200 && body?.data?.content) {
      const contentLeaked = check(res, {
        'draft by ID: no content leak': () =>
          !body.data.content.includes('Draft Secret'),
      });
      if (!contentLeaked) infoLeaks.add(1);
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.2 — ?all=true bypasses PUBLISHED filter (F26)
  // ════════════════════════════════════════════════════════
  group('19.2 — all=true Bypasses PUBLISHED Filter', () => {
    // Clear cookies for unauthenticated request
    http.cookieJar().clear(BASE_URL);

    const res = http.get(`${BASE_URL}/api/posts?all=true&limit=50`, {
      tags: { name: 'GET /api/posts?all=true (unauth)' },
    });

    const body = parseBody(res);
    const posts = body?.data || [];

    // Check if any non-PUBLISHED posts are returned
    let hasDraft = false;
    let hasArchived = false;
    for (const post of posts) {
      if (post.status === 'DRAFT') hasDraft = true;
      if (post.status === 'ARCHIVED') hasArchived = true;
    }

    const ok = check(res, {
      'all=true: no DRAFT posts returned': () => !hasDraft,
      'all=true: no ARCHIVED posts returned': () => !hasArchived,
      'all=true: only PUBLISHED posts': () =>
        posts.every((p) => p.status === 'PUBLISHED'),
    });
    if (!ok) {
      securityFails.add(1);
      infoLeaks.add(1);
      console.error('SECURITY: ?all=true exposes non-PUBLISHED posts without auth!');
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.3 — Search on drafts via ?all=true
  // ════════════════════════════════════════════════════════
  group('19.3 — Search Drafts via all=true', () => {
    http.cookieJar().clear(BASE_URL);

    const searchTerm = 'Draft Secret';
    const res = http.get(
      `${BASE_URL}/api/posts?search=${encodeURIComponent(searchTerm)}&all=true`,
      { tags: { name: 'GET /api/posts?search=&all=true (unauth)' } },
    );

    const body = parseBody(res);
    const posts = body?.data || [];

    const ok = check(res, {
      'search drafts: no draft found': () =>
        !posts.some((p) => p.status === 'DRAFT' && p.title.includes('Draft Secret')),
    });
    if (!ok) {
      securityFails.add(1);
      console.error('SECURITY: Draft searchable via ?all=true without auth!');
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.4 — Subscriber access to ad placements (F27)
  // ════════════════════════════════════════════════════════
  group('19.4 — Ad Slots Accessible to Any User', () => {
    const user = loginUser(USER_EMAIL, USER_PASSWORD);
    if (!user.ok) {
      console.warn('User login failed — skipping ad slots test');
      return;
    }

    const endpoints = [
      '/api/ads/slots',
      '/api/ads/providers',
    ];

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep}`, {
        jar: user.jar,
        tags: { name: `GET ${ep} (subscriber)` },
      });

      // Subscribers should not see admin ad configurations
      check(res, {
        [`${ep}: subscriber access controlled`]: (r) =>
          r.status === 401 || r.status === 403 || r.status === 200,
          // 200 is ok if no sensitive data exposed
      });

      // If 200, check no secrets leak
      if (res.status === 200) {
        const body = (res.body || '').toLowerCase();
        check(res, {
          [`${ep}: no api keys`]: () =>
            !body.includes('sk_') && !body.includes('api_key') &&
            !body.includes('secret'),
        });
      }
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.5 — Bulk action without proper validation (F37)
  // ════════════════════════════════════════════════════════
  group('19.5 — Posts Bulk Action Input Validation', () => {
    // Try bulk action with invalid data
    const invalidBulkPayloads = [
      { action: 'delete', ids: [] },  // Empty IDs
      { action: 'delete', ids: 'not-an-array' },  // Wrong type
      { action: 'nonexistent-action', ids: ['fake'] },  // Invalid action
      { action: 'delete', ids: Array.from({ length: 200 }, (_, i) => `fake-${i}`) },  // Over 100 limit
      { action: 'publish', ids: ["'; DROP TABLE posts; --"] },  // SQLi in IDs
    ];

    for (const payload of invalidBulkPayloads) {
      const res = http.post(
        `${BASE_URL}/api/posts/bulk`,
        JSON.stringify(payload),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts/bulk (invalid)' },
        },
      );
      checkNo500(res, `bulk-${payload.action}`);
    }

    // Subscriber should not be able to bulk delete
    const user = loginUser(USER_EMAIL, USER_PASSWORD);
    if (user.ok) {
      const res = http.post(
        `${BASE_URL}/api/posts/bulk`,
        JSON.stringify({ action: 'delete', ids: [draftId] }),
        {
          jar: user.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts/bulk (subscriber)' },
        },
      );
      const blocked = check(res, {
        'bulk: subscriber blocked': (r) => r.status === 401 || r.status === 403,
      });
      if (!blocked) securityFails.add(1);
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  19.6 — Public ad data exposure
  // ════════════════════════════════════════════════════════
  group('19.6 — Public Ad Data Exposure', () => {
    http.cookieJar().clear(BASE_URL);

    const publicAdEndpoints = [
      '/api/ads/placements?pageType=blog',
      '/api/ads/reserved-slots?pageType=blog',
      '/api/ads/ads-txt',
    ];

    for (const ep of publicAdEndpoints) {
      const res = http.get(`${BASE_URL}${ep}`, {
        tags: { name: `GET ${ep} (public)` },
      });

      // These are public by design, but check for excessive data
      if (res.status === 200) {
        const body = (res.body || '').toLowerCase();
        check(res, {
          [`${ep}: no internal IPs`]: () =>
            !body.includes('127.0.0.1') && !body.includes('localhost'),
          [`${ep}: no secret keys`]: () =>
            !body.includes('sk_') && !body.includes('secret_key'),
        });
      }
    }
  });

  // ── Cleanup ───────────────────────────────────────────
  if (draftId) {
    http.del(`${BASE_URL}/api/posts/${draftId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/posts (cleanup)' },
    });
  }
}
