// ─────────────────────────────────────────────────────────────
// Scenario 16 — Health Endpoint & Degradation
// Failure Point: F16 (Health check accuracy, cascading failures)
// ─────────────────────────────────────────────────────────────
// Tests the /api/health endpoint for correctness, response
// shape, and performance under load.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, CRON_SECRET } from '../config/env.js';
import { checkStatus, checkLatency, parseBody, checkJsonShape } from '../helpers/checks.js';

export const options = {
  scenarios: {
    health: {
      executor:   'per-vu-iterations',
      vus:        3,
      iterations: 1,
      maxDuration: '60s',
    },
  },
  thresholds: {
    errors:                 ['rate<0.1'],
    performance_violations: ['count<3'],
  },
};

export default function () {
  // ────────────────────────────────────────────
  //  Group 1: Health endpoint basic checks
  // ────────────────────────────────────────────
  group('16.1 — Health Basic', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'GET /api/health' },
    });

    checkStatus(res, 200, 'health: 200');
    const body = parseBody(res);

    check(res, {
      'health: has status field':  () => body?.status !== undefined,
      'health: status is ok/degraded': () =>
        body?.status === 'ok' || body?.status === 'degraded',
      'health: has db field':      () => body?.db !== undefined,
      'health: db is ok':          () => body?.db === 'ok',
      'health: has redis field':   () => body?.redis !== undefined,
      'health: has uptime':        () => typeof body?.uptime === 'number',
      'health: has latency':       () => typeof body?.latency === 'number',
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 2: Health endpoint performance
  // ────────────────────────────────────────────
  group('16.2 — Health Performance', () => {
    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: 'GET /api/health (perf)' },
      });
      checkLatency(res, 2000, 'health: under 2s');
      sleep(0.1);
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 3: Health doesn't require auth
  // ────────────────────────────────────────────
  group('16.3 — Health No Auth Required', () => {
    // No cookies, no headers
    const res = http.get(`${BASE_URL}/api/health`, {
      tags: { name: 'GET /api/health (no auth)' },
    });
    check(res, {
      'health: accessible without auth': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 4: Health under concurrent load
  // ────────────────────────────────────────────
  group('16.4 — Health Under Load', () => {
    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push({
        method: 'GET',
        url:    `${BASE_URL}/api/health`,
        params: { tags: { name: 'GET /api/health (batch)' } },
      });
    }

    const responses = http.batch(requests);
    let allOk = true;
    for (const res of responses) {
      if (res.status !== 200) allOk = false;
    }

    check(null, {
      'health batch: all 200': () => allOk,
    });
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 5: Cron endpoint (requires secret)
  // ────────────────────────────────────────────
  group('16.5 — Cron Invocation', () => {
    // With correct secret
    const res = http.get(`${BASE_URL}/api/cron`, {
      headers: {
        'x-cron-secret':  CRON_SECRET,
        'Authorization':  `Bearer ${CRON_SECRET}`,
        'x-cron-trigger': 'manual',
      },
      tags: { name: 'GET /api/cron (valid secret)' },
      timeout: '60s',
    });

    // Acceptable: 200 (success), 409 (concurrent lock), 503 (not configured)
    check(res, {
      'cron: valid response': (r) =>
        r.status === 200 || r.status === 409 || r.status === 503,
    });

    if (res.status === 200) {
      const body = parseBody(res);
      check(res, {
        'cron: has summary':  () => body?.summary !== undefined,
        'cron: has results':  () => body?.results !== undefined || body?.summary !== undefined,
      });
    }
  });

  sleep(0.5);

  // ────────────────────────────────────────────
  //  Group 6: Health response shape consistency
  // ────────────────────────────────────────────
  group('16.6 — Health Shape Consistency', () => {
    // Call health 5 times and ensure shape is identical
    const shapes = [];
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/api/health`, {
        tags: { name: 'GET /api/health (shape)' },
      });
      const body = parseBody(res);
      if (body) {
        shapes.push(Object.keys(body).sort().join(','));
      }
      sleep(0.2);
    }

    check(null, {
      'health shape: consistent across calls': () =>
        shapes.length >= 2 && shapes.every((s) => s === shapes[0]),
    });
  });
}
