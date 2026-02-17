// ─────────────────────────────────────────────────────────────
// Scenario 02 — IDOR Protection
// Failure Point: F01 (Insecure Direct Object References)
// ─────────────────────────────────────────────────────────────
// Verifies that users cannot access or modify other users'
// resources by guessing/brute-forcing IDs.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, USER_EMAIL, USER_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin, loginUser } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, checkIdorBlocked, checkAuthRejected, checkNo500, checkNoInternalLeak, parseBody, securityFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    idor: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.1'],
    security_failures: ['count<1'],
    idor_attempts:     ['count<1'],
  },
};

export default function () {
  // ── Setup: login as admin, create a resource ──────────
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    console.error('Admin login failed — cannot run IDOR tests');
    return;
  }

  // Create a post owned by admin
  const postPayload = makePost({ status: 'DRAFT' });
  const createRes = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(postPayload),
    {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (admin setup)' },
    },
  );
  const created = parseBody(createRes);
  const postId = created && created.data ? created.data.id : null;

  if (!postId) {
    console.error('Failed to create test post for IDOR testing');
    return;
  }

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 1: Unauthenticated user tries to modify admin post
  // ────────────────────────────────────────────
  group('02.1 — Unauth Modify Admin Post', () => {
    // Clear cookie jar so this request is truly unauthenticated
    http.cookieJar().clear(BASE_URL);

    const res = http.patch(
      `${BASE_URL}/api/posts/${postId}`,
      JSON.stringify({ title: 'IDOR Takeover' }),
      {
        headers: JSON_HEADERS,
        tags: { name: `PATCH /api/posts/${postId} (unauth)` },
      },
    );
    checkAuthRejected(res, 'unauth cannot modify post');

    // Restore admin cookies for subsequent groups
    loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 2: Regular user tries to modify admin post
  // ────────────────────────────────────────────
  group('02.2 — User Modify Admin Post', () => {
    const user = loginUser(USER_EMAIL, USER_PASSWORD);
    if (!user.ok) {
      console.warn('User login failed — skipping');
      return;
    }

    // Try to PATCH admin's post
    const patchRes = http.patch(
      `${BASE_URL}/api/posts/${postId}`,
      JSON.stringify({ title: 'IDOR Escalation' }),
      {
        jar: user.jar,
        headers: JSON_HEADERS,
        tags: { name: `PATCH /api/posts/${postId} (user idor)` },
      },
    );
    checkIdorBlocked(patchRes, 'user cannot modify admin post');

    // Try to DELETE admin's post
    const delRes = http.del(
      `${BASE_URL}/api/posts/${postId}`,
      null,
      {
        jar: user.jar,
        tags: { name: `DELETE /api/posts/${postId} (user idor)` },
      },
    );
    checkIdorBlocked(delRes, 'user cannot delete admin post');
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 3: Fabricated / non-existent IDs
  // ────────────────────────────────────────────
  group('02.3 — Fabricated IDs', () => {
    const fakeIds = [
      'nonexistent-cuid-12345',
      '1',                        // Sequential int (should not exist)
      '../../../etc/passwd',      // Path traversal in ID
      "'; DROP TABLE posts; --",  // SQLi in ID
      '<script>alert(1)</script>',
    ];

    for (const fakeId of fakeIds) {
      const res = http.get(`${BASE_URL}/api/posts/${encodeURIComponent(fakeId)}`, {
        jar: admin.jar,
        tags: { name: `GET /api/posts/${fakeId} (fabricated)` },
      });
      check(res, {
        [`fake ID ${fakeId}: not 200 or empty data`]: (r) =>
          r.status === 404 || r.status === 400 || r.status === 500 ||
          (r.status === 200 && parseBody(r)?.data === null),
      });
      checkNo500(res, `fake-id-${fakeId}`);
      checkNoInternalLeak(res, `fake-id-leak-${fakeId}`);
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 4: User tries to escalate own role via PATCH /api/users
  // ────────────────────────────────────────────
  group('02.4 — Role Escalation via User PATCH', () => {
    const user = loginUser(USER_EMAIL, USER_PASSWORD);
    if (!user.ok || !user.userId) return;

    const res = http.patch(
      `${BASE_URL}/api/users`,
      JSON.stringify({ id: user.userId, role: 'SUPER_ADMIN' }),
      {
        jar: user.jar,
        headers: JSON_HEADERS,
        tags: { name: 'PATCH /api/users (self escalation)' },
      },
    );
    checkIdorBlocked(res, 'user cannot escalate own role');

    // Verify role didn't change
    const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
      jar: user.jar,
      tags: { name: 'GET /api/auth/session (verify role)' },
    });
    const body = parseBody(sessionRes);
    check(sessionRes, {
      'role unchanged': () =>
        body && body.user && body.user.role !== 'SUPER_ADMIN',
    });
  });

  // ── Cleanup ───────────────────────────────────────────
  http.del(`${BASE_URL}/api/posts/${postId}`, null, {
    jar: admin.jar,
    tags: { name: 'DELETE /api/posts (cleanup)' },
  });
}
