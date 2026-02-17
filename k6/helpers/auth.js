// ─────────────────────────────────────────────────────────────
// Auth Helper — NextAuth v5 CSRF + Credentials Login (v2)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from '../config/env.js';

/**
 * Fetches CSRF token from NextAuth.
 * NextAuth v5 exposes GET /api/auth/csrf → { csrfToken: "..." }
 */
export function getCsrfToken(jar) {
  const res = http.get(`${BASE_URL}/api/auth/csrf`, {
    jar,
    redirects: 0,
    tags: { name: 'GET /api/auth/csrf' },
  });
  check(res, { 'csrf: 200': (r) => r.status === 200 });

  let csrfToken = '';
  try {
    const body = JSON.parse(res.body);
    csrfToken = body.csrfToken || '';
  } catch (_) { /* body may not be JSON if server errored */ }
  return csrfToken;
}

/**
 * Performs a full NextAuth credentials login.
 * Returns { jar, cookies, userId, role, ok } on success.
 *
 * Flow:
 *   1. GET /api/auth/csrf                → csrfToken + csrf cookie
 *   2. POST /api/auth/callback/credentials → session JWT cookie
 *   3. GET /api/auth/session              → verify session { user }
 */
export function login(email, password, jar) {
  jar = jar || http.cookieJar();

  const csrfToken = getCsrfToken(jar);

  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    { email, password, csrfToken, json: 'true' },
    { jar, redirects: 5, tags: { name: 'POST /api/auth/callback/credentials' } },
  );

  const loginOk = check(loginRes, {
    'login: not 401/403': (r) => r.status !== 401 && r.status !== 403,
  });

  if (!loginOk) {
    return { jar, cookies: {}, userId: null, role: null, ok: false };
  }

  const sessionRes = http.get(`${BASE_URL}/api/auth/session`, {
    jar,
    tags: { name: 'GET /api/auth/session' },
  });

  let user = null;
  try {
    const body = JSON.parse(sessionRes.body);
    user = body.user || null;
  } catch (_) {}

  const sessionOk = check(sessionRes, {
    'session: 200':    (r) => r.status === 200,
    'session: has user': () => user !== null,
  });

  const cookieHeader = buildCookieHeader(jar, BASE_URL);

  return {
    jar,
    cookies: cookieHeader,
    userId: user ? user.id : null,
    role:   user ? user.role : null,
    email:  user ? user.email : null,
    ok:     sessionOk,
  };
}

/** Login as admin (isolated jar). */
export function loginAdmin(adminEmail, adminPassword) {
  return login(adminEmail, adminPassword, http.cookieJar());
}

/** Login as regular user (isolated jar). */
export function loginUser(userEmail, userPassword) {
  return login(userEmail, userPassword, http.cookieJar());
}

/** Login as editor (isolated jar). */
export function loginEditor(editorEmail, editorPassword) {
  return login(editorEmail, editorPassword, http.cookieJar());
}

/** Login as author (isolated jar). */
export function loginAuthor(authorEmail, authorPassword) {
  return login(authorEmail, authorPassword, http.cookieJar());
}

/** Build authed request params from a session jar. */
export function authedParams(jar, extra) {
  return Object.assign({ jar, tags: {} }, extra || {});
}

/** Clear the default k6 cookie jar for a given URL. */
export function clearDefaultJar(url) {
  try { http.cookieJar().clear(url); } catch (_) {}
}

/** Build Cookie header string from a jar for a given URL. */
function buildCookieHeader(jar, url) {
  try {
    const cookies = jar.cookiesForURL(url);
    return Object.entries(cookies)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? v[0] : v}`)
      .join('; ');
  } catch (_) {
    return '';
  }
}
