// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Scenario 15 â€” Interlink Engine Lifecycle
// Failure Point: F15 (Internal linking correctness, lifecycle hooks)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Tests the full interlink lifecycle: manual link creation,
// approval/rejection, exclusion rules, and auto-linking.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { makePost, uid } from '../helpers/data.js';
import { checkStatus, checkSuccess, parseBody, dataFails } from '../helpers/checks.js';

export const options = {
  scenarios: {
    interlink: {
      executor:   'per-vu-iterations',
      vus:        1,
      iterations: 1,
      maxDuration: '180s',
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

  const cleanup = { posts: [], exclusions: [] };

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Setup: Create two posts for interlinking
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const keyword = `interlink-test-${uid()}`;

  const source = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(makePost({
      title:   `Source Post ${keyword}`,
      content: `<p>This post links to the target content about ${keyword}. It should be auto-linked.</p>`,
      status:  'PUBLISHED',
    })),
    {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (interlink source)' },
    },
  );
  const sourceId = parseBody(source)?.data?.id;
  if (sourceId) cleanup.posts.push(sourceId);

  sleep(0.5);

  const target = http.post(
    `${BASE_URL}/api/posts`,
    JSON.stringify(makePost({
      title:   `Target Post ${keyword}`,
      content: `<p>This is the target post about ${keyword}. Other posts should link here.</p>`,
      status:  'PUBLISHED',
    })),
    {
      jar: admin.jar,
      headers: JSON_HEADERS,
      tags: { name: 'POST /api/posts (interlink target)' },
    },
  );
  const targetId = parseBody(target)?.data?.id;
  if (targetId) cleanup.posts.push(targetId);

  if (!sourceId || !targetId) {
    console.error('Failed to create posts for interlink testing');
    return;
  }

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 1: Interlink report
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.1 â€” Interlink Report', () => {
    const res = http.get(`${BASE_URL}/api/seo?action=interlink-report`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=interlink-report' },
    });
    check(res, {
      'report: 200':       (r) => r.status === 200,
      'report: has data':  () => parseBody(res)?.data !== undefined || parseBody(res)?.success !== undefined,
    });
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 2: Manual link creation
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let manualLinkId = null;

  group('15.2 â€” Manual Link Creation', () => {
    const res = http.post(
      `${BASE_URL}/api/seo`,
      JSON.stringify({
        action:     'interlink-manual-link',
        sourceId,
        sourceType: 'post',
        targetId,
        targetType: 'post',
        anchorText: keyword,
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/seo (manual link)' },
      },
    );

    const body = parseBody(res);
    check(res, {
      'manual link: created': (r) => r.status === 200 || r.status === 201,
    });
    manualLinkId = body?.data?.id || body?.data?.linkId;
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 3: List links
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.3 â€” List Links', () => {
    const res = http.get(
      `${BASE_URL}/api/seo?action=interlink-list-links&sourceId=${sourceId}`,
      {
        jar: admin.jar,
        tags: { name: 'GET /api/seo?action=interlink-list-links' },
      },
    );

    check(res, {
      'list links: 200':     (r) => r.status === 200,
      'list links: has data': () => {
        const body = parseBody(res);
        return body?.data !== undefined;
      },
    });
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 4: Approve â†’ Apply link
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.4 â€” Approve & Apply Link', () => {
    if (!manualLinkId) {
      console.warn('No manual link ID â€” skipping approve/apply');
      return;
    }

    // Approve
    const approveRes = http.post(
      `${BASE_URL}/api/seo`,
      JSON.stringify({ action: 'interlink-approve', linkId: manualLinkId }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/seo (approve link)' },
      },
    );
    check(approveRes, {
      'approve: 200': (r) => r.status === 200,
    });

    sleep(0.5);

    // Apply
    const applyRes = http.post(
      `${BASE_URL}/api/seo`,
      JSON.stringify({ action: 'interlink-apply-manual', linkId: manualLinkId }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/seo (apply link)' },
      },
    );
    check(applyRes, {
      'apply: 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 5: Reject a link
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.5 â€” Reject Link', () => {
    // Create another manual link to reject
    const res = http.post(
      `${BASE_URL}/api/seo`,
      JSON.stringify({
        action:     'interlink-manual-link',
        sourceId:   targetId,
        sourceType: 'post',
        targetId:   sourceId,
        targetType: 'post',
        anchorText: 'reverse link',
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/seo (manual link 2)' },
      },
    );
    const linkId = parseBody(res)?.data?.id || parseBody(res)?.data?.linkId;

    if (linkId) {
      const rejectRes = http.post(
        `${BASE_URL}/api/seo`,
        JSON.stringify({ action: 'interlink-reject', linkId }),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/seo (reject link)' },
        },
      );
      check(rejectRes, {
        'reject: 200': (r) => r.status === 200,
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 6: Exclusion rules
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.6 â€” Exclusion Rules', () => {
    // Add exclusion
    const addRes = http.post(
      `${BASE_URL}/api/seo`,
      JSON.stringify({
        action:   'interlink-add-exclusion',
        ruleType: 'PHRASE',
        phrase:   keyword,
        reason:   'k6 test exclusion',
      }),
      {
        jar: admin.jar,
        headers: JSON_HEADERS,
        tags: { name: 'POST /api/seo (add exclusion)' },
      },
    );
    check(addRes, {
      'add exclusion: 200': (r) => r.status === 200,
    });

    const exclusionId = parseBody(addRes)?.data?.id;
    if (exclusionId) cleanup.exclusions.push(exclusionId);

    sleep(0.5);

    // List exclusions
    const listRes = http.get(`${BASE_URL}/api/seo?action=interlink-list-exclusions`, {
      jar: admin.jar,
      tags: { name: 'GET /api/seo?action=interlink-list-exclusions' },
    });
    check(listRes, {
      'list exclusions: 200': (r) => r.status === 200,
    });

    // Remove exclusion
    if (exclusionId) {
      const removeRes = http.post(
        `${BASE_URL}/api/seo`,
        JSON.stringify({ action: 'interlink-remove-exclusion', exclusionId }),
        {
          jar: admin.jar,
          headers: JSON_HEADERS,
          tags: { name: 'POST /api/seo (remove exclusion)' },
        },
      );
      check(removeRes, {
        'remove exclusion: 200': (r) => r.status === 200,
      });
    }
  });

  sleep(1);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  //  Group 7: Scan single content
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  group('15.7 â€” Scan Single Content', () => {
    const res = http.get(
      `${BASE_URL}/api/seo?action=interlink-scan&id=${sourceId}&type=post`,
      {
        jar: admin.jar,
        tags: { name: 'GET /api/seo?action=interlink-scan' },
      },
    );
    check(res, {
      'scan: 200': (r) => r.status === 200,
    });
  });

  // â”€â”€ Cleanup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  for (const id of cleanup.posts) {
    http.del(`${BASE_URL}/api/posts/${id}`, null, {
      jar: admin.jar,
      tags: { name: 'DELETE (interlink cleanup)' },
    });
    sleep(0.1);
  }
}
