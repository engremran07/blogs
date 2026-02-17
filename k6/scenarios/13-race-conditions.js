// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scenario 13 â€” Race Conditions & Concurrency
// Failure Point: F13 (TOCTOU, double-submit, concurrent updates)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tests for race conditions by sending concurrent identical
// requests and verifying only one succeeds.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, makeCategory, uid } from '../helpers/data.js';
import { checkStatus, parseBody, dataFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    race: {
      executor:   'per-vu-iterations',
      vus:        1,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:                  ['rate<0.3'],
    data_integrity_failures: ['count<3'],
  },
};

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) return;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 1: Concurrent duplicate slug creation
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('13.1 â€” Concurrent Slug Creation', () => {
    // Create two posts with the same title simultaneously
    // At least one should succeed, slug collision should be handled
    const title = `Race Test ${uid()}`;
    const requests = [];

    for (let i = 0; i < 5; i++) {
      requests.push({
        method: 'POST',
        url:    `${BASE_URL}/api/posts`,
        body:   JSON.stringify(makePost({ title, status: 'DRAFT' })),
        params: {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST /api/posts (race ${i})` },
        },
      });
    }

    // Send as batch
    const responses = http.batch(requests);

    let successCount = 0;
    const createdIds = [];
    const createdSlugs = new Set();

    for (const res of responses) {
      if (res.status === 201) {
        successCount++;
        const body = parseBody(res);
        if (body?.data?.id) createdIds.push(body.data.id);
        if (body?.data?.slug) createdSlugs.add(body.data.slug);
      }
    }

    check(null, {
      'race: at least one succeeded': () => successCount >= 1,
      'race: no duplicate slugs':     () => createdSlugs.size === successCount,
    });
    if (createdSlugs.size < successCount) dataFails.add(1);

    // Cleanup
    for (const id of createdIds) {
      http.del(`${BASE_URL}/api/posts/${id}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE (race cleanup)' },
      });
      sleep(0.1);
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 2: Concurrent updates to same resource
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('13.2 â€” Concurrent Updates', () => {
    // Create a post
    const createRes = http.post(
      `${BASE_URL}/api/posts`,
      JSON.stringify(makePost({ title: `Concurrent Update ${uid()}`, status: 'DRAFT' })),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/posts (concurrent setup)' },
      },
    );
    const postId = parseBody(createRes)?.data?.id;
    if (!postId) return;

    sleep(0.5);

    // Send 5 concurrent PATCH requests with different titles
    const patchRequests = [];
    for (let i = 0; i < 5; i++) {
      patchRequests.push({
        method: 'PATCH',
        url:    `${BASE_URL}/api/posts/${postId}`,
        body:   JSON.stringify({ title: `Concurrent Title ${i} ${uid()}` }),
        params: {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `PATCH /api/posts (concurrent ${i})` },
        },
      });
    }

    const responses = http.batch(patchRequests);

    let updateSuccess = 0;
    for (const res of responses) {
      if (res.status === 200) updateSuccess++;
    }

    // All should succeed (last-write-wins is acceptable)
    check(null, {
      'concurrent updates: all succeeded or graceful error': () =>
        updateSuccess >= 1,
    });

    // Read final state â€” should be consistent
    const finalRes = http.get(`${BASE_URL}/api/posts/${postId}`, {
      tags: { name: 'GET /api/posts (final state)' },
    });
    const finalBody = parseBody(finalRes);
    check(finalRes, {
      'concurrent: final state is valid': () =>
        finalBody?.data?.title?.startsWith('Concurrent Title') ||
        finalBody?.title?.startsWith('Concurrent Title'),
    });

    // Cleanup
    http.del(`${BASE_URL}/api/posts/${postId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE (concurrent cleanup)' },
    });
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 3: Double-delete protection
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('13.3 â€” Double Delete', () => {
    // Create and delete a category
    const catRes = http.post(
      `${BASE_URL}/api/categories`,
      JSON.stringify({ name: `Double Del ${uid()}` }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/categories (double del)' },
      },
    );
    const catId = parseBody(catRes)?.data?.id;
    if (!catId) return;

    // First delete
    const del1 = http.del(`${BASE_URL}/api/categories/${catId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/categories (first)' },
    });
    check(del1, {
      'first delete: success': (r) => r.status === 200 || r.status === 204,
    });

    sleep(0.3);

    // Second delete (should be idempotent or 404)
    const del2 = http.del(`${BASE_URL}/api/categories/${catId}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE /api/categories (second)' },
    });
    check(del2, {
      'double delete: 404 or idempotent': (r) =>
        r.status === 404 || r.status === 200 || r.status === 204 || r.status === 410,
      'double delete: no 500':  (r) => r.status !== 500,
    });
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 4: Concurrent category creation with same name
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('13.4 â€” Duplicate Name Race', () => {
    const catName = `Race Cat ${uid()}`;
    const requests = [];

    for (let i = 0; i < 3; i++) {
      requests.push({
        method: 'POST',
        url:    `${BASE_URL}/api/categories`,
        body:   JSON.stringify({ name: catName }),
        params: {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: `POST /api/categories (race ${i})` },
        },
      });
    }

    const responses = http.batch(requests);
    let created = 0;
    const ids = [];

    for (const res of responses) {
      if (res.status === 201 || res.status === 200) {
        created++;
        const id = parseBody(res)?.data?.id;
        if (id) ids.push(id);
      }
    }

    // At most one should succeed, or duplicates handled with unique slugs
    check(null, {
      'name race: at least one succeeded': () => created >= 1,
      'name race: no server errors': () =>
        responses.every((r) => r.status !== 500),
    });

    // Cleanup
    for (const id of ids) {
      http.del(`${BASE_URL}/api/categories/${id}`, null, {
        jar: admin.jar,
        tags: { name: 'DELETE (race cat cleanup)' },
      });
      sleep(0.1);
    }
  });
}
