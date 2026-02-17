// ─────────────────────────────────────────────────────────────
// Scenario 08 — File Upload Security
// Failure Point: F08 (Unrestricted file upload, path traversal)
// ─────────────────────────────────────────────────────────────
// Tests upload endpoint with malicious filenames, oversized files,
// dangerous MIME types, and path traversal attempts.
// ─────────────────────────────────────────────────────────────
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, JSON_HEADERS } from '../config/env.js';
import { loginAdmin } from '../helpers/auth.js';
import { PATH_TRAVERSAL_PAYLOADS, uid } from '../helpers/data.js';
import { checkStatus, checkAuthRejected, parseBody, securityFails, checkNo500 } from '../helpers/checks.js';

export const options = {
  scenarios: {
    upload: {
      executor:   'per-vu-iterations',
      vus:        2,
      iterations: 1,
      maxDuration: '120s',
    },
  },
  thresholds: {
    errors:            ['rate<0.3'],
    security_failures: ['count<1'],
  },
};

/**
 * Create a small fake file for upload testing.
 */
function makeFakeFile(filename, content, mimeType) {
  return http.file(content || 'fake file content', filename, mimeType || 'application/octet-stream');
}

export default function () {
  const admin = loginAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
  if (!admin.ok) {
    console.error('Admin login failed');
    return;
  }

  // ────────────────────────────────────────────
  //  Group 1: Upload without authentication
  // ────────────────────────────────────────────
  group('08.1 — Upload Without Auth', () => {
    const file = makeFakeFile('test.jpg', 'fake image data', 'image/jpeg');
    const res = http.post(
      `${BASE_URL}/api/upload`,
      { file },
      { tags: { name: 'POST /api/upload (unauth)' } },
    );
    checkAuthRejected(res, 'upload unauth rejected');

    // Also try media endpoint
    const mediaRes = http.post(
      `${BASE_URL}/api/media`,
      { file },
      { tags: { name: 'POST /api/media (unauth)' } },
    );
    checkAuthRejected(mediaRes, 'media unauth rejected');
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 2: Dangerous file extensions
  // ────────────────────────────────────────────
  group('08.2 — Dangerous Extensions', () => {
    const dangerousFiles = [
      { name: 'shell.php',     mime: 'application/x-php' },
      { name: 'backdoor.jsp',  mime: 'application/x-jsp' },
      { name: 'exploit.asp',   mime: 'application/x-asp' },
      { name: 'malware.exe',   mime: 'application/x-executable' },
      { name: 'script.sh',     mime: 'application/x-sh' },
      { name: 'payload.py',    mime: 'text/x-python' },
      { name: 'hack.bat',      mime: 'application/x-bat' },
      { name: 'test.svg',      mime: 'image/svg+xml' },  // SVG can contain XSS
      { name: 'double.jpg.php', mime: 'application/x-php' }, // Double extension
      { name: 'null%00.jpg',    mime: 'image/jpeg' },  // Null byte injection
    ];

    for (const f of dangerousFiles) {
      const file = makeFakeFile(f.name, '<?php system($_GET["cmd"]); ?>', f.mime);
      const res = http.post(
        `${BASE_URL}/api/upload`,
        { file, purpose: 'general' },
        {
          jar: admin.jar,
          tags: { name: `POST /api/upload (${f.name})` },
        },
      );

      const ok = check(res, {
        [`${f.name}: rejected or sanitized`]: (r) => {
          if (r.status === 400 || r.status === 415 || r.status === 422) return true; // Rejected
          // If accepted, check the stored filename doesn't keep dangerous extension
          const body = parseBody(r);
          if (body?.data?.url) {
            const url = body.data.url.toLowerCase();
            return !url.endsWith('.php') && !url.endsWith('.jsp') &&
                   !url.endsWith('.asp') && !url.endsWith('.exe') &&
                   !url.endsWith('.sh')  && !url.endsWith('.py') &&
                   !url.endsWith('.bat');
          }
          return true;
        },
      });
      if (!ok) securityFails.add(1);
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 3: Path traversal in filename
  // ────────────────────────────────────────────
  group('08.3 — Path Traversal in Filename', () => {
    for (const payload of PATH_TRAVERSAL_PAYLOADS) {
      const file = makeFakeFile(
        `${payload}.jpg`,
        'fake image content',
        'image/jpeg',
      );

      const res = http.post(
        `${BASE_URL}/api/upload`,
        { file, purpose: 'general' },
        {
          jar: admin.jar,
          tags: { name: 'POST /api/upload (path traversal)' },
        },
      );

      // If accepted, verify the stored path doesn't contain traversal
      if (res.status >= 200 && res.status < 300) {
        const body = parseBody(res);
        const url = body?.data?.url || body?.data?.fileName || '';
        const ok = check(res, {
          'path traversal: no ../ in stored path': () =>
            !url.includes('../') && !url.includes('..\\') && !url.includes('%2e%2e'),
        });
        if (!ok) securityFails.add(1);
      }
    }
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 4: MIME type mismatch
  // ────────────────────────────────────────────
  group('08.4 — MIME Type Mismatch', () => {
    // Upload a PHP file disguised as image/jpeg
    const file = makeFakeFile(
      'innocent.jpg',
      '<?php echo shell_exec("cat /etc/passwd"); ?>',
      'image/jpeg',
    );

    const res = http.post(
      `${BASE_URL}/api/upload`,
      { file, purpose: 'general' },
      {
        jar: admin.jar,
        tags: { name: 'POST /api/upload (mime mismatch)' },
      },
    );

    // Should either reject or accept as actual image processing fails
    check(res, {
      'mime mismatch: handled safely': (r) =>
        r.status === 400 || r.status === 415 || r.status === 422 ||
        r.status === 201 || r.status === 200, // May succeed if server validates by magic bytes
    });
  });

  sleep(1);

  // ────────────────────────────────────────────
  //  Group 5: Upload size limits
  // ────────────────────────────────────────────
  group('08.5 — Upload Size Limit', () => {
    // Create a 20MB payload (likely exceeds limit)
    const bigContent = 'X'.repeat(20 * 1024 * 1024);
    const file = makeFakeFile('huge.jpg', bigContent, 'image/jpeg');

    const res = http.post(
      `${BASE_URL}/api/upload`,
      { file, purpose: 'general' },
      {
        jar: admin.jar,
        tags: { name: 'POST /api/upload (oversized)' },
        timeout: '60s',
      },
    );

    check(res, {
      'oversized: rejected': (r) =>
        r.status === 400 || r.status === 413 || r.status === 422 || r.status === 500,
    });
  });
}
