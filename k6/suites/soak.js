// ─────────────────────────────────────────────────────────────
// Suite: Soak Test — Endurance / reliability (30-60 min)
// ─────────────────────────────────────────────────────────────
// Sustained moderate load over an extended period to detect
// memory leaks, connection pool exhaustion, and degradation.
//
//   k6 run k6/suites/soak.js
//   k6 run k6/suites/soak.js --env SOAK_DURATION=30m
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, makeCategory, makeComment, uid } from '../helpers/data.js';
import { checkStatus, parseBody, errorRate, apiLatency } from '../helpers/checks.js';

const soakDuration = __ENV.SOAK_DURATION || '15m';

// Track degradation over time
const healthLatency = new Trend('health_check_latency', true);
const degradationDetected = new Counter('degradation_events');

export const options = {
  scenarios: {
    // Sustained load
    soak_readers: {
      executor:     'constant-vus',
      vus:          5,
      duration:     soakDuration,
      exec:         'readerLoop',
      tags:         { scenario: 'readers' },
    },
    soak_writers: {
      executor:     'constant-vus',
      vus:          2,
      duration:     soakDuration,
      exec:         'writerLoop',
      tags:         { scenario: 'writers' },
    },
    // Health monitoring (canary)
    health_monitor: {
      executor:     'constant-arrival-rate',
      rate:         1,             // 1 health check per second
      timeUnit:     '10s',         // = 1 check every 10s
      duration:     soakDuration,
      preAllocatedVUs: 1,
      exec:         'healthLoop',
      tags:         { scenario: 'monitor' },
    },
  },
  thresholds: {
    errors:                  ['rate<0.05'],     // < 5% errors
    api_latency:             ['p(95)<5000'],     // 95th < 5s
    health_check_latency:    ['p(99)<3000'],     // Health probe stable
    degradation_events:      ['count<5'],        // Minimal degradation
    http_req_duration:       ['p(95)<5000'],
  },
};

// ── Reader loop ─────────────────────────────────────────────
export function readerLoop() {
  group('soak.read', () => {
    // List posts
    const listRes = http.get(
      `${BASE_URL}/api/posts?page=${Math.ceil(Math.random() * 5)}&limit=10`,
      { tags: { name: 'GET /api/posts (soak)' } },
    );
    apiLatency.add(listRes.timings.duration);

    // Read a specific post
    const posts = parseBody(listRes)?.data || [];
    if (posts.length > 0) {
      const post = posts[Math.floor(Math.random() * posts.length)];
      const detailRes = http.get(`${BASE_URL}/api/posts/${post.id}`, {
        tags: { name: 'GET /api/posts/:id (soak)' },
      });
      apiLatency.add(detailRes.timings.duration);

      // Read comments for that post
      http.get(`${BASE_URL}/api/comments?postId=${post.id}&limit=10`, {
        tags: { name: 'GET /api/comments (soak)' },
      });
    }

    // Browse taxonomies
    http.get(`${BASE_URL}/api/categories`, {
      tags: { name: 'GET /api/categories (soak)' },
    });
    http.get(`${BASE_URL}/api/tags?limit=20`, {
      tags: { name: 'GET /api/tags (soak)' },
    });
  });

  sleep(3 + Math.random() * 5); // 3-8s think time
}

// ── Writer loop ─────────────────────────────────────────────
export function writerLoop() {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    sleep(10);
    return;
  }

  group('soak.write', () => {
    // Create post
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/posts (soak)' },
      },
    );
    apiLatency.add(createRes.timings.duration);

    const postId = parseBody(createRes)?.data?.id;
    sleep(2);

    if (postId) {
      // Update
      http.patch(
        `${BASE_URL}/api/posts/${postId}`,
        JSON.stringify({ title: `Soak Updated ${uid()}` }),
        {
          jar: admin.jar,
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'PATCH /api/posts (soak)' },
        },
      );
      sleep(2);

      // Delete (cleanup)
      http.del(`${BASE_URL}/api/posts/${postId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/posts (soak)' },
      });
    }

    // Category CRUD
    const catRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify(makeCategory()),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/categories (soak)' },
      },
    );
    const catId = parseBody(catRes)?.data?.id;
    if (catId) {
      sleep(1);
      http.del(`${BASE_URL}/api/categories/${catId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/categories (soak)' },
      });
    }
  });

  sleep(5 + Math.random() * 10); // 5-15s think time
}

// ── Health monitor (canary) ─────────────────────────────────
export function healthLoop() {
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'GET /api/health (soak monitor)' },
  });

  healthLatency.add(res.timings.duration);

  const ok = check(res, {
    'health: reachable':  (r) => r.status === 200 || r.status === 503,
    'health: under 2s':   (r) => r.timings.duration < 2000,
  });

  if (!ok) {
    degradationDetected.add(1);
    console.warn(`Degradation at ${new Date().toISOString()}: status=${res.status}, latency=${res.timings.duration}ms`);
  }

  // Track body for degradation
  const body = parseBody(res);
  if (body?.status === 'degraded') {
    degradationDetected.add(1);
    console.warn(`System degraded at ${new Date().toISOString()}: redis=${body.redis}, db=${body.db}`);
  }
}

// ── Teardown ────────────────────────────────────────────────
export function teardown() {
  console.log('Soak test complete. Check degradation_events and health_check_latency trends.');

  const healthRes = http.get(`${BASE_URL}/api/health`);
  const body = JSON.parse(healthRes.body || '{}');
  console.log(`Final health: status=${body.status}, db=${body.db}, redis=${body.redis}`);
}
