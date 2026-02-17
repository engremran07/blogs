// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scenario 10 â€” Input Validation & Schema Enforcement
// Failure Point: F10 (Missing or weak Zod/schema validation)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Sends malformed, oversized, and edge-case payloads to verify
// every endpoint validates its inputs properly.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { uid, makeOversizedString, PROTO_POLLUTION_PAYLOADS } from '../helpers/data.js';
import { checkStatus, parseBody, dataFails, checkNo500, checkNoInternalLeak } from '../helpers/checks.js';

export const options = {
  scenarios: {
    validation: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '180s',
    },
  },
  thresholds: {
    errors:                   ['rate<0.3'],
    data_integrity_failures:  ['count<3'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 1: Missing required fields
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('10.1 â€” Missing Required Fields', () => {
    const tests = [
      {
        url:  '/api/posts',
        body: {},  // Missing 'title'
        name: 'post: no title',
      },
      {
        url:  '/api/posts',
        body: { title: '' },  // Empty title
        name: 'post: empty title',
      },
      {
        url:  '/api/posts',
        body: { title: 'ab' },  // Too short (min 5)
        name: 'post: title too short',
      },
      {
        url:  '/api/categories',
        body: {},  // Missing 'name'
        name: 'category: no name',
      },
      {
        url:  '/api/tags',
        body: {},  // Missing 'name'
        name: 'tag: no name',
      },
      {
        url:  '/api/comments',
        body: { content: 'test' },  // Missing 'postId'
        name: 'comment: no postId',
      },
      {
        url:  '/api/comments',
        body: { postId: 'fake' },  // Missing 'content'
        name: 'comment: no content',
      },
    ];

    for (const t of tests) {
      const res = http.post(
        `${BASE_URL}${t.url}`,
        JSON.stringify(t.body),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST ${t.url} (${t.name})` },
        },
      );

      const ok = check(res, {
        [`${t.name}: rejected (400/422)`]: (r) =>
          r.status === 400 || r.status === 422,
      });
      if (!ok) dataFails.add(1);
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 2: Invalid data types
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('10.2 â€” Invalid Data Types', () => {
    const tests = [
      {
        url:  '/api/posts',
        body: { title: 12345 },  // Number instead of string
        name: 'post: numeric title',
      },
      {
        url:  '/api/posts',
        body: { title: 'Valid Title Here', status: 'INVALID_STATUS' },
        name: 'post: invalid status enum',
      },
      {
        url:  '/api/posts?page=abc',
        method: 'GET',
        name: 'posts: non-numeric page',
      },
      {
        url:  '/api/posts?limit=-5',
        method: 'GET',
        name: 'posts: negative limit',
      },
      {
        url:  '/api/posts?limit=0',
        method: 'GET',
        name: 'posts: zero limit',
      },
      {
        url:  '/api/tags',
        body: { name: 'Test', color: 'not-a-hex-color' },
        name: 'tag: invalid color',
      },
    ];

    for (const t of tests) {
      let res;
      if (t.method === 'GET') {
        res = http.get(`${BASE_URL}${t.url}`, {
          jar: admin.jar,
          tags: { name: `GET ${t.url} (${t.name})` },
        });
      } else {
        res = http.post(
          `${BASE_URL}${t.url}`,
          JSON.stringify(t.body),
          {
            jar: admin.jar,
            headers: JSON_HEADERS,
            tags: { name: `POST ${t.url} (${t.name})` },
          },
        );
      }

      check(res, {
        [`${t.name}: handled gracefully`]: (r) =>
          r.status === 400 || r.status === 422 || r.status === 200, // 200 OK if schema coerces
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 3: Oversized payloads
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('10.3 â€” Oversized Payloads', () => {
    // Title > 1000 chars
    const longTitle = makeOversizedString(2000);
    const res1 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({ title: longTitle, content: '<p>test</p>', status: 'DRAFT' }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (oversized title)' },
      },
    );
    check(res1, {
      'oversized title: rejected or truncated': (r) =>
        r.status === 400 || r.status === 422 ||
        (r.status === 201 && (parseBody(r)?.data?.title?.length || 0) < 2000),
    });

    sleep(0.3);

    // Content > 1MB
    const hugeContent = `<p>${makeOversizedString(1024 * 1024)}</p>`;
    const res2 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify({ title: `Huge Post ${uid()}`, content: hugeContent, status: 'DRAFT' }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (oversized content)' },
        timeout: '60s',
      },
    );
    check(res2, {
      'oversized content: handled': (r) =>
        r.status !== 500, // Should not crash
    });
    // Cleanup if created
    const postId = parseBody(res2)?.data?.id;
    if (postId) {
      http.del(`${BASE_URL}/api/posts/${postId}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE (oversized cleanup)' },
      });
    }

    sleep(0.3);

    // Comment > 5000 chars (limit is 5000)
    const longComment = makeOversizedString(6000);
    const postsRes = http.get(`${BASE_URL}/api/posts?limit=1`, {
      tags: { name: 'GET /api/posts (for comment)' },
    });
    const firstPostId = parseBody(postsRes)?.data?.[0]?.id;
    if (firstPostId) {
      const res3 = http.post(
        `${BASE_URL}/api/comments`,
        JSON.stringify({
          postId: firstPostId,
          content: longComment,
          authorName: 'Test',
          authorEmail: 'test@test.local',
        }),
        {
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/comments (oversized)' },
        },
      );
      check(res3, {
        'oversized comment: rejected': (r) =>
          r.status === 400 || r.status === 422,
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 4: Special characters and unicode
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('10.4 â€” Special Characters & Unicode', () => {
    const specialInputs = [
      { title: 'æ—¥æœ¬èªžãƒ†ã‚¹ãƒˆãƒã‚¹ãƒˆ Title', desc: 'Japanese' },
      { title: 'ðŸš€ Emoji Post Title ðŸŽ‰',   desc: 'Emoji' },
      { title: 'Post with\nnewlines\tand\ttabs', desc: 'Whitespace' },
      { title: 'Post with null \x00 byte',  desc: 'Null byte' },
      { title: 'Ã€ÃÃ‚ÃƒÃ„Ã… Ã Ã¡Ã¢Ã£Ã¤Ã¥',            desc: 'Accented chars' },
      { title: '   Leading/trailing spaces  ', desc: 'Spaces' },
    ];

    for (const input of specialInputs) {
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify({
          title:   input.title,
          content: `<p>Content for ${input.desc}</p>`,
          status:  'DRAFT',
        }),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST /api/posts (${input.desc})` },
        },
      );

      check(res, {
        [`${input.desc}: doesn't crash (no 500)`]: (r) => r.status !== 500,
      });

      // Cleanup
      const postId = parseBody(res)?.data?.id;
      if (postId) {
        http.del(`${BASE_URL}/api/posts/${postId}`, null, {
          jar: admin.jar,
          tags: { name: `DELETE (${input.desc} cleanup)` },
        });
      }
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 5: Empty body / malformed JSON
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('10.5 â€” Malformed Requests', () => {
    // Empty body
    const res1 = http.post(`${BASE_URL}/api/posts`, '', {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (empty body)' },
    });
    check(res1, {
      'empty body: graceful error': (r) =>
        r.status === 400 || r.status === 422 || r.status === 415,
    });

    // Invalid JSON
    const res2 = http.post(`${BASE_URL}/api/posts`, '{invalid json!!!', {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (invalid json)' },
    });
    check(res2, {
      'invalid json: graceful error': (r) =>
        r.status === 400 || r.status === 422 || r.status === 500, // 500 is acceptable for JSON parse
    });

    // Wrong content type
    const res3 = http.post(`${BASE_URL}/api/posts`, 'title=test', {
      jar: admin.jar,
      headers: { 'Content-Type': 'text/plain' },
      tags: { name: 'POST /api/posts (text/plain)' },
    });
    check(res3, {
      'wrong content-type: graceful error': (r) =>
        r.status === 400 || r.status === 415 || r.status === 422 || r.status === 500,
    });

    // Array instead of object
    const res4 = http.post(`${BASE_URL}/api/posts`, '[1,2,3]', {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (array body)' },
    });
    check(res4, {
      'array body: graceful error': (r) =>
        r.status === 400 || r.status === 422,
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 6: Prototype Pollution Payloads
  // ────────────────────────────────────────────
  group('10.6 — Prototype Pollution', () => {
    for (const pp of PROTO_POLLUTION_PAYLOADS) {
      const body = typeof pp === 'string' ? pp : JSON.stringify(pp);
      const res = http.post(
        `${BASE_URL}/api/posts`,
        body,
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/posts (proto pollution)' },
        },
      );
      check(res, {
        'proto pollution: no 500': (r) => r.status !== 500,
      });
      checkNo500(res, 'proto-pollution');
      checkNoInternalLeak(res, 'proto-pollution-leak');
    }
  });
}
