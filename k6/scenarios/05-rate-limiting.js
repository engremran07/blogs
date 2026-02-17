// ─────────────────────────────────────────────────────────────
// Scenario 05 — Rate Limiting Enforcement
// Failure Point: F05 (Rate limiter bypass / misconfiguration)
// ─────────────────────────────────────────────────────────────
// Verifies the 30 mutations/60s sliding window is enforced
// on POST/PUT/PATCH/DELETE and that GET is exempt.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, RATE_LIMIT_MAX, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makeCategory, uid } from '../helpers/data.js';
import { checkStatus, parseBody, rateLimitHits, errorRate } from '../helpers/checks.js';

export const options = {
  scenarios: {
    ratelimit: {
      executor:   'per-vu-iterations',
      vus:        1,  // Single VU to test per-IP limit
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:           ['rate<0.3'],  // Some requests SHOULD fail (429)
    rate_limit_429s:  ['count>0'],   // We expect at least one 429
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    console.error('Admin login failed');
    return;
  }

  const createdIds = [];

  // ────────────────────────────────────────────
  //  Group 1: Exhaust rate limit with mutations
  // ────────────────────────────────────────────
  group('05.1 — Exhaust Mutation Rate Limit', () => {
    let got429 = false;
    const total = RATE_LIMIT_MAX + 5; // Go 5 over the limit

    for (let i = 0; i < total; i++) {
      const cat = makeCategory();
      const res = http.post(
        `${BASE_URL}/api/categories`,
        JSON.stringify(cat),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/categories (rate test)' },
        },
      );

      if (res.status === 429) {
        got429 = true;
        rateLimitHits.add(1);

        // Verify Retry-After header
        check(res, {
          'rate limit: 429 status': (r) => r.status === 429,
          'rate limit: has Retry-After': (r) =>
            r.headers['Retry-After'] !== undefined,
        });

        console.log(`Rate limited at request ${i + 1}/${total}`);
        break; // No need to keep hammering
      }

      // Track for cleanup
      const body = parseBody(res);
      if (body?.data?.id) {
        createdIds.push(body.data.id);
      }
    }

    check(null, {
      'rate limit triggered': () => got429,
    });
    if (!got429) {
      console.error(`SECURITY: Rate limit NOT triggered after ${total} mutations!`);
    }
  });

  sleep(2);

  // ────────────────────────────────────────────
  //  Group 2: GET requests should NOT be rate-limited
  // ────────────────────────────────────────────
  group('05.2 — GET Exempt from Rate Limit', () => {
    let getBlocked = false;

    for (let i = 0; i < 50; i++) {
      const res = http.get(`${BASE_URL}/api/posts?page=1&limit=1`, {
        tags: { name: 'GET /api/posts (rate test)' },
      });
      if (res.status === 429) {
        getBlocked = true;
        break;
      }
    }

    check(null, {
      'GET not rate-limited after 50 requests': () => !getBlocked,
    });
  });

  sleep(2);

  // ────────────────────────────────────────────
  //  Group 3: /api/auth exempt from rate limit
  // ────────────────────────────────────────────
  group('05.3 — Auth Routes Exempt', () => {
    let authBlocked = false;

    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/auth/csrf`, {
        tags: { name: 'GET /api/auth/csrf (rate test)' },
      });
      if (res.status === 429) {
        authBlocked = true;
        break;
      }
    }

    check(null, {
      'auth routes not rate-limited': () => !authBlocked,
    });
  });

  // ── Cleanup created categories ────────────────────────
  for (const id of createdIds) {
    http.del(`${BASE_URL}/api/categories/${id}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/categories (cleanup)' },
    });
    sleep(0.1);
  }
}
