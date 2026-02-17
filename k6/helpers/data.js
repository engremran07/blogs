// ─────────────────────────────────────────────────────────────
// Test Data Generators — VU-unique, deterministic (v2)
// ─────────────────────────────────────────────────────────────
// Uses __VU + __ITER + Date.now() for uniqueness.
// ─────────────────────────────────────────────────────────────

/** Unique tag for this VU + iteration (prevents collisions). */
export function uid() {
  return `vu${__VU}-i${__ITER}-${Date.now()}`;
}

/** Generate a unique post payload. */
export function makePost(overrides) {
  const id = uid();
  return Object.assign({
    title:   `K6 Test Post ${id}`,
    content: `<p>This is automated test content for post ${id}. It contains enough words to pass the minimum content requirements and exercise word count and reading time calculations.</p>`,
    status:  'DRAFT',
    excerpt: `Test excerpt ${id}`,
  }, overrides || {});
}

/** Generate a unique page payload. */
export function makePage(overrides) {
  const id = uid();
  return Object.assign({
    title:    `K6 Test Page ${id}`,
    content:  `<p>Automated test page content ${id}. Sufficient content for validation.</p>`,
    status:   'DRAFT',
    template: 'DEFAULT',
  }, overrides || {});
}

/** Generate a unique category payload. */
export function makeCategory(overrides) {
  const id = uid();
  return Object.assign({
    name:        `K6 Cat ${id}`,
    description: `Test category ${id}`,
  }, overrides || {});
}

/** Generate a unique tag payload. */
export function makeTag(overrides) {
  const id = uid();
  return Object.assign({
    name:        `K6 Tag ${id}`,
    description: `Test tag ${id}`,
  }, overrides || {});
}

/** Generate a comment payload. */
export function makeComment(postId, overrides) {
  const id = uid();
  return Object.assign({
    postId,
    content:     `K6 test comment ${id}`,
    authorName:  `TestUser${__VU}`,
    authorEmail: `testuser${__VU}@k6.test`,
  }, overrides || {});
}

/** Generate a user registration payload. */
export function makeUser(overrides) {
  const id = uid();
  return Object.assign({
    email:    `k6-${id}@test.local`,
    password: 'K6TestPass!123',
    name:     `K6 User ${id}`,
  }, overrides || {});
}

// ── Attack Payloads ─────────────────────────────────────────

/** XSS payloads for injection testing. */
export const XSS_PAYLOADS = [
  '<script>alert("xss")</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '"><script>alert(document.cookie)</script>',
  "javascript:alert('xss')",
  '<iframe src="javascript:alert(1)">',
  '<body onload=alert(1)>',
  '<input onfocus=alert(1) autofocus>',
  '<details open ontoggle=alert(1)>',
  '<math><mtext><table><mglyph><style><!--</style><img src=x onerror=alert(1)>',
  '<a href="&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29">xss</a>',
  '{{constructor.constructor("alert(1)")()}}',
];

/** SQL injection payloads. */
export const SQL_PAYLOADS = [
  "'; DROP TABLE posts; --",
  "' OR '1'='1",
  "1; SELECT * FROM users --",
  "' UNION SELECT null, null, null --",
  "admin'--",
  "1' AND '1'='1",
  "'; WAITFOR DELAY '0:0:5'; --",
  "' OR 1=1 LIMIT 1 --",
  "1; UPDATE users SET role='SUPER_ADMIN' WHERE email='",
  "') OR ('1'='1",
];

/** NoSQL injection payloads. */
export const NOSQL_PAYLOADS = [
  '{"$gt": ""}',
  '{"$ne": null}',
  '{"$regex": ".*"}',
  '{"$where": "sleep(5000)"}',
];

/** Path traversal payloads for upload testing. */
export const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '....//....//....//etc/passwd',
  '.%00./%00./%00./%00./%00./etc/passwd',
];

/** Open redirect payloads. */
export const OPEN_REDIRECT_PAYLOADS = [
  'https://evil.com',
  '//evil.com',
  '/\\evil.com',
  '/%2f%2fevil.com',
  'javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
];

/** Header injection / CRLF payloads. */
export const HEADER_INJECTION_PAYLOADS = [
  'test\r\nX-Injected: true',
  'test%0d%0aX-Injected: true',
  'test\nBcc: attacker@evil.com',
];

/** CRLF injection payloads (alias). */
export const CRLF_PAYLOADS = HEADER_INJECTION_PAYLOADS;

/** Server-Side Template Injection payloads. */
export const SSTI_PAYLOADS = [
  '{{7*7}}',
  '${7*7}',
  '<%= 7*7 %>',
  '#{7*7}',
  '{{constructor.constructor("return this")()}}',
  '{{config}}',
];

/** Prototype pollution payloads (JSON strings). */
export const PROTO_POLLUTION_PAYLOADS = [
  '{"__proto__":{"isAdmin":true}}',
  '{"constructor":{"prototype":{"isAdmin":true}}}',
  '{"__proto__":{"role":"SUPER_ADMIN"}}',
  '{"__proto__":{"toString":"pwned"}}',
];

/** Mass assignment payloads. */
export const MASS_ASSIGNMENT_FIELDS = [
  { role: 'SUPER_ADMIN' },
  { isAdmin: true },
  { verified: true },
  { emailVerified: new Date().toISOString() },
  { hashedPassword: '$2b$10$fakehash' },
];

// ── Oversized / Boundary Data ───────────────────────────────

/** Generate a string of specified length. */
export function makeOversizedString(length) {
  let s = '';
  const chunk = 'A'.repeat(1000);
  while (s.length < length) s += chunk;
  return s.substring(0, length);
}

/** Generate deeply nested JSON. */
export function makeDeepJson(depth) {
  let nested = '';
  for (let i = 0; i < depth; i++) nested += '{"a":';
  nested += '"x"';
  for (let i = 0; i < depth; i++) nested += '}';
  return nested;
}

/** Generate a slug from text. */
export function toSlug(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}
