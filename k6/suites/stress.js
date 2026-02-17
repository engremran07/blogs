// ─────────────────────────────────────────────────────────────
// Suite: Stress Test — Breaking point discovery (5-15 min)
// ─────────────────────────────────────────────────────────────
// Ramps VUs aggressively to find the breaking point, then
// verifies the system recovers gracefully.
//
//   k6 run k6/suites/stress.js
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, parseBody, errorRate, apiLatency, checkLatency } from '../helpers/checks.js';

export const options = {
  scenarios: {
    // Aggressive ramp to find breaking point
    stress_ramp: {
      executor:     'ramping-vus',
      startVUs:     0,
      stages: [
        { duration: '30s',  target: 5 },    // Warm up
        { duration: '1m',   target: 20 },   // Ramp to moderate
        { duration: '1m',   target: 50 },   // Ramp to high
        { duration: '2m',   target: 50 },   // Hold at peak
        { duration: '1m',   target: 100 },  // Spike
        { duration: '30s',  target: 100 },  // Hold spike
        { duration: '1m',   target: 0 },    // Recovery
      ],
      exec: 'stressTraffic',
    },
  },
  thresholds: {
    errors:      ['rate<0.3'],           // Up to 30% errors acceptable under stress
    api_latency: ['p(95)<10000'],         // 95th < 10s under stress
    http_req_failed: ['rate<0.5'],        // Less than 50% total failures
  },
};

export function stressTraffic() {
  const action = Math.random();

  if (action < 0.6) {
    // 60%: Public reads
    group('stress.read', () => {
      const res = http.get(
        `${BASE_URL}/api/posts?page=${Math.ceil(Math.random() * 10)}&limit=10`,
        { tags: { name: 'GET /api/posts (stress)' } },
      );
      apiLatency.add(res.timings.duration);

      if (res.status === 200) {
        const posts = parseBody(res)?.data || [];
        if (posts.length > 0) {
          const post = posts[Math.floor(Math.random() * posts.length)];
          const detailRes = http.get(`${BASE_URL}/api/posts/${post.id}`, {
            tags: { name: 'GET /api/posts/:id (stress)' },
          });
          apiLatency.add(detailRes.timings.duration);
        }
      }
    });

  } else if (action < 0.8) {
    // 20%: Category/tag reads
    group('stress.taxonomies', () => {
      http.get(`${BASE_URL}/api/categories`, {
        tags: { name: 'GET /api/categories (stress)' },
      });
      http.get(`${BASE_URL}/api/tags?limit=20`, {
        tags: { name: 'GET /api/tags (stress)' },
      });
    });

  } else if (action < 0.9) {
    // 10%: Health pings
    group('stress.health', () => {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: 'GET /api/health (stress)' },
      });
      apiLatency.add(res.timings.duration);
    });

  } else {
    // 10%: Writer traffic (requires auth)
    group('stress.write', () => {
      const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      if (!admin.ok) return;

      const postRes = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(makePost({ status: 'DRAFT' })),
        {
          jar: admin.jar,
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'POST /api/posts (stress)' },
        },
      );
      apiLatency.add(postRes.timings.duration);

      const postId = parseBody(postRes)?.data?.id;
      if (postId) {
        sleep(0.5);
        http.del(`${BASE_URL}/api/posts/${postId}`, null, {
          jar: admin.jar,
          tags: { name: 'DELETE /api/posts (stress)' },
        });
      }
    });
  }

  sleep(0.5 + Math.random() * 2);
}

// ── Recovery verification ───────────────────────────────────
export function teardown() {
  // After stress, verify the system recovers
  sleep(5);

  const healthRes = http.get(`${BASE_URL}/api/health`);
  const recoveryOk = check(healthRes, {
    'recovery: health returns 200': (r) => r.status === 200,
    'recovery: db ok': () => {
      const body = JSON.parse(healthRes.body || '{}');
      return body?.db === 'ok';
    },
  });

  if (recoveryOk) {
    console.log('✓ System recovered after stress test');
  } else {
    console.error('✗ System did NOT recover after stress test!');
  }
}
