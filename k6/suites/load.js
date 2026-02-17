// ─────────────────────────────────────────────────────────────
// Suite: Load Test — Standard traffic simulation (5-10 min)
// ─────────────────────────────────────────────────────────────
// Simulates realistic mixed-traffic patterns with ramp-up,
// steady state, and ramp-down phases.
//
//   k6 run k6/suites/load.js
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, makeCategory, makeComment, uid } from '../helpers/data.js';
import { checkStatus, parseBody, errorRate, apiLatency, checkLatency } from '../helpers/checks.js';

export const options = {
  scenarios: {
    // Public read traffic (majority)
    public_readers: {
      executor:     'ramping-vus',
      startVUs:     0,
      stages: [
        { duration: '30s', target: 10 },   // Ramp up
        { duration: '3m',  target: 10 },   // Steady state
        { duration: '30s', target: 0 },    // Ramp down
      ],
      exec: 'publicTraffic',
      tags: { scenario: 'public' },
    },
    // Admin CRUD traffic
    admin_writers: {
      executor:     'ramping-vus',
      startVUs:     0,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '3m',  target: 3 },
        { duration: '30s', target: 0 },
      ],
      exec:      'adminTraffic',
      startTime: '10s',   // Stagger start
      tags:      { scenario: 'admin' },
    },
    // Comment writers (guests)
    commenters: {
      executor:     'ramping-vus',
      startVUs:     0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '3m',  target: 5 },
        { duration: '30s', target: 0 },
      ],
      exec:      'commenterTraffic',
      startTime: '15s',
      tags:      { scenario: 'commenters' },
    },
  },
  thresholds: {
    errors:      ['rate<0.05'],          // < 5% error rate
    api_latency: ['p(95)<3000'],          // 95th percentile < 3s
    'http_req_duration{scenario:public}':  ['p(95)<2000'],
    'http_req_duration{scenario:admin}':   ['p(95)<5000'],
  },
};

// ── Public reader VU ────────────────────────────────────────
export function publicTraffic() {
  group('load.public', () => {
    // Browse posts listing
    const listRes = http.get(
      `${BASE_URL}/api/posts?page=${Math.ceil(Math.random() * 5)}&limit=10`,
      { tags: { name: 'GET /api/posts (load)' } },
    );
    checkStatus(listRes, 200);
    checkLatency(listRes, 3000);

    const posts = parseBody(listRes)?.data || [];
    if (posts.length > 0) {
      // Read a random post
      const randomPost = posts[Math.floor(Math.random() * posts.length)];
      const getRes = http.get(`${BASE_URL}/api/posts/${randomPost.id}`, {
        tags: { name: 'GET /api/posts/:id (load)' },
      });
      checkStatus(getRes, 200);
      checkLatency(getRes, 2000);
    }

    sleep(1 + Math.random() * 3); // Think time 1-4s

    // Browse categories
    const catRes = http.get(`${BASE_URL}/api/categories`, {
      tags: { name: 'GET /api/categories (load)' },
    });
    checkStatus(catRes, 200);

    sleep(1 + Math.random() * 2);

    // Browse tags
    const tagRes = http.get(`${BASE_URL}/api/tags?limit=20`, {
      tags: { name: 'GET /api/tags (load)' },
    });
    checkStatus(tagRes, 200);

    sleep(1 + Math.random() * 2);

    // Search
    const searchTerms = ['test', 'blog', 'post', 'hello', 'world'];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    const searchRes = http.get(`${BASE_URL}/api/posts?search=${term}&limit=5`, {
      tags: { name: 'GET /api/posts?search= (load)' },
    });
    checkStatus(searchRes, 200);
  });

  sleep(2 + Math.random() * 3);
}

// ── Admin writer VU ─────────────────────────────────────────
export function adminTraffic() {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    sleep(5);
    return;
  }

  group('load.admin', () => {
    // Create a post
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/posts (load)' },
      },
    );
    const postId = parseBody(createRes)?.data?.id;

    sleep(2);

    if (postId) {
      // Update it
      http.patch(
        `${BASE_URL}/api/posts/${postId}`,
        JSON.stringify({ title: `Load Updated ${uid()}`, status: 'PUBLISHED' }),
        {
          jar: admin.jar,
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'PATCH /api/posts/:id (load)' },
        },
      );

      sleep(2);

      // Delete it
      http.del(`${BASE_URL}/api/posts/${postId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/posts/:id (load)' },
      });
    }

    sleep(2);

    // Create and delete a category
    const catRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify(makeCategory()),
      {
        jar: admin.jar,
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'POST /api/categories (load)' },
      },
    );
    const catId = parseBody(catRes)?.data?.id;
    if (catId) {
      sleep(1);
      http.del(`${BASE_URL}/api/categories/${catId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE /api/categories (load)' },
      });
    }
  });

  sleep(3 + Math.random() * 5);
}

// ── Commenter VU ────────────────────────────────────────────
export function commenterTraffic() {
  group('load.comments', () => {
    // Find a published post to comment on
    const listRes = http.get(`${BASE_URL}/api/posts?limit=5&status=PUBLISHED`, {
      tags: { name: 'GET /api/posts (commenter)' },
    });
    const posts = parseBody(listRes)?.data || [];

    if (posts.length > 0) {
      const post = posts[Math.floor(Math.random() * posts.length)];

      // Read existing comments
      http.get(`${BASE_URL}/api/comments?postId=${post.id}&limit=10`, {
        tags: { name: 'GET /api/comments (load)' },
      });

      sleep(2 + Math.random() * 3);

      // Submit a comment (may be blocked by rate limit, captcha, or kill switch)
      const commentRes = http.post(
        `${BASE_URL}/api/comments`,
        JSON.stringify(makeComment(post.id)),
        {
          headers: { 'Content-Type': 'application/json' },
          tags: { name: 'POST /api/comments (load)' },
        },
      );

      // Accept 201 (created), 403 (disabled/captcha), 429 (rate limit)
      check(commentRes, {
        'comment: accepted response': (r) =>
          [200, 201, 400, 403, 429].includes(r.status),
      });
    }
  });

  sleep(5 + Math.random() * 10);
}
