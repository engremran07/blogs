// ─────────────────────────────────────────────────────────────
// Scenario 07 — User Enumeration / Information Leaks
// Failure Point: F02 (Leaking user existence, emails, IDs)
// ─────────────────────────────────────────────────────────────
// Verifies that error messages don't differentiate between
// existing/non-existing users and that sensitive data isn't leaked.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin, getCsrfToken } from '../helpers/auth.js';
import { parseBody, securityFails, checkNoSensitiveLeaks } from '../helpers/checks.js';

export const options = {
  scenarios: {
    enum: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.1'],
    security_failures: ['count<1'],
  },
};

export default function () {
  // ────────────────────────────────────────────
  //  Group 1: Login enumeration — same error for valid vs invalid email
  // ────────────────────────────────────────────
  group('07.1 — Login Enumeration', () => {
    const jar = http.cookieJar();
    const csrf = getCsrfToken(jar);

    // Attempt login with KNOWN email, wrong password
    const knownRes = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      { email: ADMIN_EMAIL, password: 'WrongPassword!123', csrfToken: csrf, json: 'true' },
      { jar, redirects: 0, tags: { name: 'POST /api/auth (known email, bad pass)' } },
    );

    sleep(0.5);

    // Attempt login with UNKNOWN email
    const jar2 = http.cookieJar();
    const csrf2 = getCsrfToken(jar2);
    const unknownRes = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      { email: 'nonexistent-user@doesnotexist.test', password: 'WrongPassword!123', csrfToken: csrf2, json: 'true' },
      { jar: jar2, redirects: 0, tags: { name: 'POST /api/auth (unknown email)' } },
    );

    // Both should return the same status code (no enumeration)
    check(null, {
      'login enum: same status for known vs unknown': () =>
        knownRes.status === unknownRes.status,
    });

    // Check response bodies don't reveal which is which
    const knownBody = (knownRes.body || '').toLowerCase();
    const unknownBody = (unknownRes.body || '').toLowerCase();

    const revealingPhrases = [
      'user not found',
      'email not found',
      'no account',
      'email does not exist',
      'user does not exist',
      'invalid email',
      'unknown email',
    ];

    let revealed = false;
    for (const phrase of revealingPhrases) {
      if (unknownBody.includes(phrase) && !knownBody.includes(phrase)) {
        revealed = true;
        break;
      }
    }

    const ok = check(null, {
      'login enum: no revealing error messages': () => !revealed,
    });
    if (!ok) securityFails.add(1);
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Registration enumeration
  // ────────────────────────────────────────────
  group('07.2 — Registration Enumeration', () => {
    // Try registering with a known email
    const knownRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email:    ADMIN_EMAIL,
        password: 'StrongPass!123',
        name:     'Enum Test',
      }),
      {
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/auth/register (known email)' },
      },
    );

    // Response should NOT reveal "email already exists" in a way
    // that differentiates from other errors
    const body = (knownRes.body || '').toLowerCase();
    checkNoSensitiveLeaks(knownRes, 'register: no sensitive leaks');
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: User list doesn't leak passwords
  // ────────────────────────────────────────────
  group('07.3 — User List No Password Leak', () => {
    const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin.ok) return;

    const res = http.get(`${BASE_URL}/api/users?limit=10`, {
      jar: admin.jar,
      tags: { name: 'GET /api/users (password leak check)' },
    });

    const body = (res.body || '');
    check(res, {
      'user list: no password field': () => !body.includes('"password"'),
      'user list: no hashedPassword': () => !body.includes('hashedPassword'),
      'user list: no bcrypt hash':    () => !body.includes('$2b$'),
      'user list: no bcrypt prefix':  () => !body.includes('$2a$'),
    });
    checkNoSensitiveLeaks(res, 'user list: sensitive data check');
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: Single user endpoint doesn't leak extras
  // ────────────────────────────────────────────
  group('07.4 — Single User No Extra Leaks', () => {
    const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin.ok || !admin.userId) return;

    const res = http.get(`${BASE_URL}/api/users?id=${admin.userId}`, {
      jar: admin.jar,
      tags: { name: 'GET /api/users?id= (leak check)' },
    });

    check(res, {
      'single user: no password':       () => !(res.body || '').includes('"password"'),
      'single user: no hashedPassword': () => !(res.body || '').includes('hashedPassword'),
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 5: Error responses don't leak stack traces
  // ────────────────────────────────────────────
  group('07.5 — No Stack Trace Leaks', () => {
    // Trigger errors and check no stack traces
    const errorTriggers = [
      `${BASE_URL}/api/posts/undefined`,
      `${BASE_URL}/api/posts?page=-1`,
      `${BASE_URL}/api/posts?limit=999999`,
    ];

    for (const url of errorTriggers) {
      const res = http.get(url, {
        tags: { name: 'GET (error trigger)' },
      });

      const body = (res.body || '').toLowerCase();
      check(res, {
        'no stack trace':     () => !body.includes('at ') || !body.includes('.js:'),
        'no file paths':      () => !body.includes('/src/') && !body.includes('\\src\\'),
        'no node_modules':    () => !body.includes('node_modules'),
        'no prisma internals': () => !body.includes('prisma/client'),
      });
    }
  });
}
