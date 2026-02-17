// ─────────────────────────────────────────────────────────────
// Common Check Helpers & Assertions (v2)
// ─────────────────────────────────────────────────────────────
import { check } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// ── Custom Metrics ──────────────────────────────────────────
export const errorRate          = new Rate('errors');
export const securityFails      = new Counter('security_failures');
export const dataFails          = new Counter('data_integrity_failures');
export const perfViolations     = new Counter('performance_violations');
export const rateLimitHits      = new Counter('rate_limit_429s');
export const authBypassAttempts = new Counter('auth_bypass_attempts');
export const xssLeaks           = new Counter('xss_payload_leaks');
export const injectionLeaks     = new Counter('injection_leaks');
export const idorAttempts       = new Counter('idor_attempts');
export const headerFails        = new Counter('header_security_failures');
export const infoLeaks          = new Counter('information_leaks');
export const apiLatency         = new Trend('api_latency', true);

// ── Status Checks ───────────────────────────────────────────

/** Assert response status equals expected. */
export function checkStatus(res, expected, label) {
  const name = label || `status is ${expected}`;
  const ok = check(res, { [name]: (r) => r.status === expected });
  if (!ok) errorRate.add(1);
  else errorRate.add(0);
  return ok;
}

/** Assert response is success JSON with { success: true }. */
export function checkSuccess(res, label) {
  const name = label || 'response success';
  let body;
  try { body = JSON.parse(res.body); } catch (_) { body = {}; }

  const ok = check(res, {
    [`${name}: 2xx`]:     (r) => r.status >= 200 && r.status < 300,
    [`${name}: success`]: () => body.success === true,
  });
  if (!ok) errorRate.add(1);
  else errorRate.add(0);
  return ok;
}

/** Assert response is an error with expected status code. */
export function checkError(res, expectedStatus, label) {
  const name = label || `error ${expectedStatus}`;
  return check(res, {
    [`${name}: status`]: (r) => r.status === expectedStatus,
  });
}

// ── Security Checks ─────────────────────────────────────────

/** Check that response body does NOT contain any of the given payloads. */
export function checkNoPayloadReflection(res, payloads, label) {
  const name = label || 'no payload reflection';
  const body = res.body || '';
  let leaked = false;
  for (const payload of payloads) {
    if (body.includes(payload)) {
      leaked = true;
      xssLeaks.add(1);
      break;
    }
  }
  const ok = check(res, { [name]: () => !leaked });
  if (!ok) securityFails.add(1);
  return ok;
}

/** Check that an unauthorized request is properly rejected (401 or 403). */
export function checkAuthRejected(res, label) {
  const name = label || 'auth rejected';
  const ok = check(res, {
    [`${name}: 401 or 403`]: (r) => r.status === 401 || r.status === 403,
  });
  if (!ok) {
    securityFails.add(1);
    authBypassAttempts.add(1);
  }
  return ok;
}

/** Check that response doesn't leak sensitive fields. */
export function checkNoSensitiveLeaks(res, label) {
  const name = label || 'no sensitive data leaked';
  const body = (res.body || '').toLowerCase();
  const sensitivePatterns = ['password', 'hashedpassword', 'secret', '$2b$', '$2a$', 'bcrypt'];
  let leaked = false;
  for (const pattern of sensitivePatterns) {
    if (body.includes(pattern)) {
      leaked = true;
      break;
    }
  }
  const ok = check(res, { [name]: () => !leaked });
  if (!ok) {
    securityFails.add(1);
    infoLeaks.add(1);
  }
  return ok;
}

/** Check that IDOR attempt is blocked. */
export function checkIdorBlocked(res, label) {
  const name = label || 'IDOR blocked';
  const ok = check(res, {
    [`${name}: not 200`]: (r) =>
      r.status === 401 || r.status === 403 || r.status === 404,
  });
  if (!ok) {
    securityFails.add(1);
    idorAttempts.add(1);
  }
  return ok;
}

/** Check that response doesn't leak stack traces or internal paths. */
export function checkNoInfoLeak(res, label) {
  const name = label || 'no info leak';
  const body = (res.body || '').toLowerCase();
  const leakPatterns = [
    'at ',         // stack trace
    '/src/',       // file paths
    '\\src\\',     // windows paths
    'node_modules',
    'prisma/client',
    'next.js',     // framework name
    'next_',       // Next.js env prefix
    '.ts:',        // TypeScript file references
    '.js:',        // JS file references (in stack traces)
  ];
  let leaked = false;
  for (const pattern of leakPatterns) {
    if (body.includes(pattern)) {
      // Exclude false positives from legitimate content
      if (pattern === 'at ' && !body.includes('.js:') && !body.includes('.ts:')) continue;
      leaked = true;
      break;
    }
  }
  const ok = check(res, { [name]: () => !leaked });
  if (!ok) infoLeaks.add(1);
  return ok;
}

/** Check that SQL error details are NOT leaked. */
export function checkNoSqlLeak(res, label) {
  const name = label || 'no SQL leak';
  const body = (res.body || '').toLowerCase();
  const dbLeakPatterns = [
    'syntax error', 'pg_catalog', 'information_schema', 'sqlstate',
    'unterminated', 'query error', 'prisma.post', 'prisma.user',
    'invocation:', 'invalid.*input.*syntax', 'relation.*does not exist',
    'column.*does not exist',
  ];

  let leaked = false;
  for (const pattern of dbLeakPatterns) {
    if (body.match(new RegExp(pattern))) {
      leaked = true;
      injectionLeaks.add(1);
      break;
    }
  }
  const ok = check(res, {
    [`${name}: no DB error leak`]: () => !leaked,
    [`${name}: not 500`]: () => res.status !== 500,
  });
  if (leaked) securityFails.add(1);
  return !leaked;
}

/** Check required security headers are present. */
export function checkSecurityHeaders(res, label) {
  const name = label || 'security headers';
  let allPresent = true;

  const checks = {};
  const headerNames = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
  ];

  for (const h of headerNames) {
    const key = `${name}: has ${h}`;
    const present = res.headers[h] !== undefined;
    checks[key] = () => present;
    if (!present) allPresent = false;
  }

  // Check no server info leakage
  checks[`${name}: no X-Powered-By`] = () => !res.headers['X-Powered-By'];

  const ok = check(res, checks);
  if (!ok) headerFails.add(1);
  return ok;
}

// ── Data Checks ─────────────────────────────────────────────

/** Check standard pagination shape: { success, data[], total, page, totalPages }. */
export function checkPagination(res, label) {
  const name = label || 'pagination';
  let body;
  try { body = JSON.parse(res.body); } catch (_) { body = {}; }

  return check(res, {
    [`${name}: has data array`]: () => Array.isArray(body.data),
    [`${name}: has total`]:      () => typeof body.total === 'number',
    [`${name}: has page`]:       () => typeof body.page === 'number',
    [`${name}: has totalPages`]: () => typeof body.totalPages === 'number',
  });
}

/** Check response body has valid JSON with required top-level keys. */
export function checkJsonShape(res, requiredKeys, label) {
  const name = label || 'json shape';
  let body;
  try { body = JSON.parse(res.body); } catch (_) { body = null; }

  const ok = check(res, {
    [`${name}: valid json`]: () => body !== null,
  });
  if (!ok) return false;

  for (const key of requiredKeys) {
    check(body, {
      [`${name}: has ${key}`]: (b) => b[key] !== undefined,
    });
  }
  return true;
}

// ── Performance Checks ──────────────────────────────────────

/** Check response time is under threshold (ms). */
export function checkLatency(res, maxMs, label) {
  const name = label || `latency < ${maxMs}ms`;
  apiLatency.add(res.timings.duration);
  const ok = check(res, {
    [name]: (r) => r.timings.duration < maxMs,
  });
  if (!ok) perfViolations.add(1);
  return ok;
}

// ── Helper: Parse JSON Body ─────────────────────────────────

export function parseBody(res) {
  try { return JSON.parse(res.body); }
  catch (_) { return null; }
}

// ── Aliases for backward compat ─────────────────────────────

/** Check response is NOT 500. */
export function checkNo500(res, label) {
  const name = label || 'not 500';
  const ok = check(res, { [name]: (r) => r.status !== 500 });
  if (!ok) errorRate.add(1);
  return ok;
}

/** Alias for checkNoInfoLeak. */
export const checkNoInternalLeak = checkNoInfoLeak;