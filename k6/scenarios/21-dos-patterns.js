// ─────────────────────────────────────────────────────────────
// Scenario 21 — DoS & Resource Exhaustion Patterns
// Failure Points: F21 (OG image exhaustion), F28 (Mass registration),
//                 F22 (Rate-limit bypass via X-Forwarded-For),
//                 F44 (Deep JSON nesting)
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import {
  BASE_URL,
  ADMIN_EMAIL, ADMIN_PASSWORD,
  JSON_HEADERS,
} from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import {
  makeUser,
  makeDeepJson,
  makeOversizedString,
  uid,
} from '../helpers/data.js';
import {
  checkNo500,
  checkLatency,
  parseBody,
  securityFails,
  rateLimitHits,
} from '../helpers/checks.js';

export const options = {
  scenarios: {
    dos: {
      executor:    'per-vu-iterations',
      vus:         1,
      iterations:  1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:              ['rate<0.3'],
    security_failures:   ['count<3'],
  },
};

export default function () {
  // ════════════════════════════════════════════════════════
  //  21.1 — OG Image endpoint resource exhaustion (F21)
  // ════════════════════════════════════════════════════════
  group('21.1 — OG Image Burst', () => {
    const titles = [
      'Normal Title',
      'A'.repeat(90),
      'Unicode: 日本語タイトル 中文标题 한국어',
      '<script>alert(1)</script>',
      "'; DROP TABLE posts; --",
    ];

    for (const title of titles) {
      const res = http.get(
        `${BASE_URL}/api/og?title=${encodeURIComponent(title)}`,
        {
          tags: { name: 'GET /api/og (dos)' },
          timeout: '30s',
        },
      );

      check(res, {
        [`og(${title.substring(0, 15)}): safe response`]: (r) =>
          r.status === 200 || r.status === 400 || r.status === 500,
      });
      checkLatency(res, 10000, `og latency: ${title.substring(0, 15)}`);
    }

    // Rapid-fire to test if any caching/throttling exists
    for (let i = 0; i < 10; i++) {
      const res = http.get(
        `${BASE_URL}/api/og?title=Burst+Test+${i}`,
        { tags: { name: 'GET /api/og (burst)' }, timeout: '30s' },
      );
      check(res, {
        [`og burst ${i}: responds`]: (r) => r.status !== 0,
      });
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  21.2 — Mass registration abuse (F28)
  // ════════════════════════════════════════════════════════
  group('21.2 — Mass Registration', () => {
    let successCount = 0;
    let blocked = false;
    const max = 15; // Try 15 rapid registrations

    for (let i = 0; i < max; i++) {
      const user = makeUser();
      const res = http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify(user),
        {
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/auth/register (mass)' },
        },
      );

      if (res.status === 429) {
        blocked = true;
        rateLimitHits.add(1);
        console.log(`Registration rate-limited at attempt ${i + 1}`);
        break;
      }
      if (res.status === 201 || res.status === 200) {
        successCount++;
      }
      if (res.status === 403) {
        // Registration disabled
        console.log('Registration disabled — skipping mass registration test');
        return;
      }
    }

    check(null, {
      'mass reg: rate limited or controlled': () => blocked || successCount < max,
    });

    if (!blocked && successCount >= max) {
      console.warn(`SECURITY: ${successCount} accounts created without rate limit!`);
      securityFails.add(1);
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  21.3 — Rate-limit bypass via X-Forwarded-For (F22)
  // ════════════════════════════════════════════════════════
  group('21.3 — X-Forwarded-For IP Spoofing', () => {
    // Send ad events with spoofed IPs to bypass per-IP rate limit
    let bypassCount = 0;

    for (let i = 0; i < 20; i++) {
      const res = http.post(
        `${BASE_URL}/api/ads/events`,
        JSON.stringify({
          placementId: 'fake-placement-id',
          eventType:   'impression',
          metadata:    {},
        }),
        {
          headers: {
            ...JSON_HEADERS,
            'X-Forwarded-For': `10.0.${Math.floor(i / 256)}.${i % 256}`,
          },
          tags: { name: 'POST /api/ads/events (ip spoof)' },
        },
      );

      if (res.status === 200 || res.status === 201) {
        bypassCount++;
      }
    }

    // If all 20 succeed despite rapid fire, rate limiting may be bypassable
    check(null, {
      'ad events: not all succeed with spoofed IPs': () => bypassCount < 20,
    });

    if (bypassCount >= 20) {
      console.warn('SECURITY: Ad events rate limit bypassed via X-Forwarded-For spoofing!');
      securityFails.add(1);
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  21.4 — Deep JSON nesting DoS (F44)
  // ════════════════════════════════════════════════════════
  group('21.4 — Deep JSON Nesting', () => {
    const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin.ok) return;

    const depths = [50, 100, 500];

    for (const depth of depths) {
      const deepJson = makeDeepJson(depth);

      const res = http.post(
        `${BASE_URL}/api/posts`,
        deepJson,
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST /api/posts (depth=${depth})` },
          timeout: '30s',
        },
      );

      check(res, {
        [`depth=${depth}: no crash`]: (r) => r.status !== 0,
        [`depth=${depth}: not 500`]:  (r) => r.status !== 500,
      });
      checkLatency(res, 10000, `deep json d=${depth}`);
    }
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  21.5 — Oversized request body
  // ════════════════════════════════════════════════════════
  group('21.5 — Oversized Request Body', () => {
    const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    if (!admin.ok) return;

    // 2MB title field
    const hugePost = {
      title:   makeOversizedString(2 * 1024 * 1024),
      content: '<p>Normal content</p>',
      status:  'DRAFT',
    };

    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(hugePost),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (2MB title)' },
        timeout: '30s',
      },
    );

    check(res, {
      'oversized title: rejected or handled': (r) =>
        r.status === 400 || r.status === 413 || r.status === 422 || r.status === 500,
    });
  });

  sleep(1);

  // ════════════════════════════════════════════════════════
  //  21.6 — Slowloris-style search
  // ════════════════════════════════════════════════════════
  group('21.6 — Long Search Query', () => {
    const longQuery = 'A'.repeat(10000);
    const res = http.get(
      `${BASE_URL}/api/posts?search=${encodeURIComponent(longQuery)}`,
      {
        tags: { name: 'GET /api/posts?search (long)' },
        timeout: '30s',
      },
    );

    checkNo500(res, 'long search');
    checkLatency(res, 10000, 'long search latency');
  });
}
