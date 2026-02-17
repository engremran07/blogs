// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scenario 14 â€” Slug Collision & Uniqueness
// Failure Point: F14 (Slug collisions, non-deterministic slugs)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tests slug auto-generation, uniqueness enforcement,
// special character handling, and collision resolution.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, uid, toSlug } from '../helpers/data.js';
import { checkStatus, parseBody, dataFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    slug: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:                  ['rate<0.2'],
    data_integrity_failures: ['count<1'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  const cleanup = [];

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 1: Duplicate titles produce unique slugs
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('14.1 â€” Duplicate Title â†’ Unique Slugs', () => {
    const title = `Slug Collision Test ${uid()}`;

    // Create first post
    const res1 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (slug 1)' },
      },
    );
    const post1 = parseBody(res1)?.data;
    if (post1?.id) cleanup.push(post1.id);

    sleep(0.5);

    // Create second post with identical title
    const res2 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (slug 2)' },
      },
    );
    const post2 = parseBody(res2)?.data;
    if (post2?.id) cleanup.push(post2.id);

    if (post1?.slug && post2?.slug) {
      const ok = check(null, {
        'duplicate title: different slugs': () => post1.slug !== post2.slug,
        'slug 1 is valid format': () => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post1.slug),
        'slug 2 is valid format': () => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post2.slug),
      });
      if (!ok) dataFails.add(1);
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 2: Slug format validation
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('14.2 â€” Slug Format Sanitization', () => {
    const testCases = [
      { input: 'Hello World Post',     expected: /^hello-world-post/ },
      { input: 'CafÃ© RÃ©sumÃ© NaÃ¯ve',    expected: /^caf/ },
      { input: '  spaces  everywhere  ', expected: /^spaces/ },
      { input: 'UPPERCASE TITLE',       expected: /^uppercase-title/ },
      { input: 'post---with---dashes',  expected: /[a-z0-9]/ },
      { input: 'post_with_underscores', expected: /[a-z0-9]/ },
      { input: '!@#$%^&*()',            expected: /[a-z0-9]/ },
    ];

    for (const tc of testCases) {
      const fullTitle = `${tc.input} ${uid()}`;
      const res = http.post(
        `${BASE_URL}/api/posts`,
        JSON.stringify(makePost({ title: fullTitle, status: 'DRAFT' })),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST /api/posts (slug: ${tc.input.substring(0, 15)})` },
        },
      );

      const data = parseBody(res)?.data;
      if (data?.id) cleanup.push(data.id);

      if (data?.slug) {
        check(null, {
          [`"${tc.input.substring(0, 15)}": valid slug`]: () =>
            /^[a-z0-9]+(?:-[a-z0-9]+)*(-\d+)?$/.test(data.slug),
          [`"${tc.input.substring(0, 15)}": lowercase`]: () =>
            data.slug === data.slug.toLowerCase(),
          [`"${tc.input.substring(0, 15)}": no special chars`]: () =>
            !/[^a-z0-9-]/.test(data.slug),
        });
      }
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 3: Manual slug override
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('14.3 â€” Manual Slug Override', () => {
    const customSlug = `custom-slug-${uid()}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `Manual Slug Test ${uid()}`, slug: customSlug, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (custom slug)' },
      },
    );

    const data = parseBody(res)?.data;
    if (data?.id) cleanup.push(data.id);

    if (data?.slug) {
      check(null, {
        'custom slug preserved': () => data.slug === customSlug || data.slug.startsWith(customSlug.substring(0, 20)),
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 4: Slug collision on PATCH
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('14.4 â€” Slug Collision on Update', () => {
    // Create two posts
    const res1 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `Patch Slug A ${uid()}`, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (slug patch A)' },
      },
    );
    const post1 = parseBody(res1)?.data;
    if (post1?.id) cleanup.push(post1.id);

    const res2 = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `Patch Slug B ${uid()}`, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (slug patch B)' },
      },
    );
    const post2 = parseBody(res2)?.data;
    if (post2?.id) cleanup.push(post2.id);

    if (post1?.id && post2?.slug) {
      // Try to set post1's slug to post2's slug
      const patchRes = http.patch(
        `${BASE_URL}/api/posts/${post1.id}`,
        JSON.stringify({ slug: post2.slug }),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'PATCH /api/posts (slug collision)' },
        },
      );

      check(patchRes, {
        'slug collision on patch: rejected (409) or auto-resolved': (r) =>
          r.status === 409 || r.status === 400 ||
          (r.status === 200 && parseBody(r)?.data?.slug !== post2.slug),
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 5: XSS in slug field
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('14.5 â€” XSS in Slug', () => {
    const xssSlug = '<script>alert(1)</script>';
    const res = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `XSS Slug ${uid()}`, slug: xssSlug, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (xss slug)' },
      },
    );

    const data = parseBody(res)?.data;
    if (data?.id) cleanup.push(data.id);

    if (data?.slug) {
      check(null, {
        'xss slug: sanitized': () => !data.slug.includes('<script>'),
        'xss slug: no angle brackets': () => !data.slug.includes('<') && !data.slug.includes('>'),
        'xss slug: valid format': () => /^[a-z0-9]+(?:-[a-z0-9]+)*(-\d+)?$/.test(data.slug),
      });
    }
  });

  // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const id of cleanup) {
    http.del(`${BASE_URL}/api/posts/${id}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE (slug cleanup)' },
    });
    sleep(0.1);
  }
}
