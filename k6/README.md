# k6 Enterprise Test Suite

Performance, security, and reliability test suite for the MyBlog Next.js application using [k6](https://k6.io).

## Quick Start

### Prerequisites

1. **Install k6**: https://k6.io/docs/get-started/installation/
   ```bash
   # Windows (winget)
   winget install k6

   # macOS (brew)
   brew install k6

   # Linux (apt)
   sudo gpg -k
   sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D68
   echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
   sudo apt-get update && sudo apt-get install k6
   ```

2. **Start the app** (dev server or Docker):
   ```bash
   npm run dev              # Dev server on :3000
   # or
   docker compose up -d     # Docker Compose
   ```

3. **Seed test users** (if not already present):
   - Admin: `admin@myblog.com` / `Aa1357` (SUPER_ADMIN)
   - Editor: `sarah@myblog.com` / `TestPass123!@` (EDITOR)
   - Author: `mike@myblog.com` / `TestPass123!@` (AUTHOR)
   - User: `reader1@myblog.com` / `TestPass123!@` (SUBSCRIBER)

### Run Tests

```powershell
# PowerShell (Windows)
.\k6\run.ps1 smoke                        # Quick validation (~2 min)
.\k6\run.ps1 load                         # Standard load test (~5 min)
.\k6\run.ps1 stress                       # Breaking point (~8 min)
.\k6\run.ps1 soak                         # Endurance (~15 min)
.\k6\run.ps1 scenario 01-auth-flow        # Single scenario
.\k6\run.ps1 all                          # All 22 scenarios
```

```bash
# Bash (Linux/macOS)
./k6/run.sh smoke
./k6/run.sh scenario 05-rate-limiting
./k6/run.sh all
```

```bash
# Direct k6 (any OS)
k6 run k6/suites/smoke.js
k6 run k6/scenarios/01-auth-flow.js
```

### Environment Overrides

```bash
k6 run k6/suites/smoke.js \
  --env BASE_URL=http://staging:3000 \
  --env ADMIN_EMAIL=admin@myblog.com \
  --env ADMIN_PASSWORD=Aa1357
```

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | Target application URL |
| `ADMIN_EMAIL` | `admin@myblog.com` | Admin account email |
| `ADMIN_PASSWORD` | `Aa1357` | Admin account password |
| `EDITOR_EMAIL` | `sarah@myblog.com` | Editor account email |
| `EDITOR_PASSWORD` | `TestPass123!@` | Editor account password |
| `AUTHOR_EMAIL` | `mike@myblog.com` | Author account email |
| `AUTHOR_PASSWORD` | `TestPass123!@` | Author account password |
| `USER_EMAIL` | `reader1@myblog.com` | Subscriber account email |
| `USER_PASSWORD` | `TestPass123!@` | Subscriber account password |
| `CRON_SECRET` | `local-cron-secret-change-in-prod` | Cron endpoint secret |
| `RATE_LIMIT_MAX` | `30` | Expected rate limit threshold |
| `SOAK_DURATION` | `15m` | Soak test duration |

---

## Architecture

```
k6/
├── config/
│   └── env.js                  # Central config (env vars, thresholds, security header expectations)
├── helpers/
│   ├── auth.js                 # NextAuth login flow (CSRF → Credentials → Session) — 4 role logins
│   ├── data.js                 # Test data generators, attack payloads (XSS, SQLi, CRLF, SSTI, etc.)
│   └── checks.js               # Custom metrics & assertion helpers (25+ check functions)
├── scenarios/                   # 22 individual test scenarios
│   ├── 01-auth-flow.js         # Authentication lifecycle & session validation
│   ├── 02-idor-protection.js   # Insecure Direct Object Reference prevention
│   ├── 03-xss-injection.js     # Cross-Site Scripting (stored, reflected, CRLF, SSTI)
│   ├── 04-sql-injection.js     # SQL/NoSQL/prototype pollution injection
│   ├── 05-rate-limiting.js     # Rate limiter enforcement & exemptions
│   ├── 06-csrf-validation.js   # CSRF token validation & forged cookies
│   ├── 07-enumeration-leaks.js # User enumeration & password leak prevention
│   ├── 08-file-upload.js       # Upload security (extensions, traversal, MIME, size)
│   ├── 09-role-escalation.js   # RBAC / 5-role hierarchy / privilege escalation
│   ├── 10-input-validation.js  # Schema validation / edge cases / boundary testing
│   ├── 11-cache-poisoning.js   # Cache consistency & header poisoning
│   ├── 12-pagination-bombs.js  # Pagination boundary & sort injection
│   ├── 13-race-conditions.js   # Concurrency / TOCTOU / double-delete
│   ├── 14-slug-collision.js    # Slug uniqueness & sanitization
│   ├── 15-interlink-lifecycle.js # Internal linking engine lifecycle
│   ├── 16-health-degradation.js # Health endpoint & cron invocation
│   ├── 17-seo-audit.js         # SEO audit & meta generation
│   ├── 18-security-headers.js  # CSP, CORS, X-Powered-By, cache-control, method confusion
│   ├── 19-access-control-gaps.js # Draft access via ID, ?all=true bypass, bulk action validation
│   ├── 20-information-disclosure.js # Sitemap, robots, 404 handling, sensitive file exposure
│   ├── 21-dos-patterns.js      # OG image DoS, mass registration, IP spoofing, deep JSON
│   └── 22-mass-assignment.js   # Mass assignment, prototype pollution, open redirect, JWT
├── suites/                      # Orchestrated test suites
│   ├── smoke.js                # Quick pre-deploy check (~2 min)
│   ├── load.js                 # Realistic mixed traffic (~5 min)
│   ├── stress.js               # Breaking point discovery (~8 min)
│   └── soak.js                 # Endurance / leak detection (~15-60 min)
├── run.ps1                     # PowerShell runner
├── run.sh                      # Bash runner
└── README.md                   # This file
```

---

## Audit Failure Point Coverage

### Original Failure Points (F01–F17)

| # | Failure Point | Scenario | Coverage |
|---|---|---|---|
| F01 | IDOR via sequential IDs | `01`, `02` | CUIDs verified, access control tested |
| F02 | User enumeration | `07` | Login/register error message analysis |
| F03 | Stored XSS | `03` | 12 XSS payloads × 5 injection vectors + CRLF + SSTI |
| F04 | SQL/NoSQL injection | `04` | 14 payloads across queries, bodies, paths, login |
| F05 | Rate limit bypass | `05` | Exhausts 30/60s limit, verifies GET exempt |
| F06 | CSRF on mutations | `06` | Cookie-less, forged cookie, missing CSRF token |
| F07 | Token lifecycle | `01` | Session verification, invalid credentials |
| F08 | Unrestricted upload | `08` | Dangerous extensions, path traversal, MIME mismatch, size |
| F09 | Privilege escalation | `09` | Full 5-role hierarchy, admin endpoints, cron secret |
| F10 | Missing validation | `10` | Missing fields, wrong types, oversized, malformed JSON |
| F11 | Cache poisoning | `11` | Write-read consistency, header poisoning |
| F12 | Pagination bombs | `12` | Huge limits, negative pages, sort injection |
| F13 | Race conditions | `13` | Concurrent creates, updates, double-delete |
| F14 | Slug collisions | `14` | Duplicate titles, special chars, PATCH collisions |
| F15 | Interlink lifecycle | `15` | Manual link CRUD, exclusions, scan, approve/reject |
| F16 | Health check accuracy | `16` | Shape, performance, load resilience, cron |
| F17 | SEO data quality | `17` | Overview, audits, meta generation, auto-link |

### Extended Failure Points (F18–F44)

| # | Failure Point | Scenario | Severity |
|---|---|---|---|
| F18 | Missing X-XSS-Protection | `18` | Low |
| F19 | Security headers on page routes | `18` | Medium |
| F20 | X-Powered-By suppression | `18` | Low |
| F21 | OG image resource exhaustion | `21` | Medium |
| F22 | Ad events rate-limit bypass via IP spoofing | `21` | **HIGH** |
| F25 | Draft posts accessible by ID without auth | `19` | **HIGH** |
| F26 | ?all=true bypasses PUBLISHED filter | `19` | Medium |
| F27 | Ad slots readable by any authenticated user | `19` | Medium |
| F28 | Registration mass account creation | `21` | **HIGH** |
| F31 | Sitemap content enumeration | `20` | Low |
| F32 | Robots.txt structure revelation | `20` | Low |
| F33 | Unknown route handling | `20` | Low |
| F34 | Health endpoint info disclosure | `20` | Low |
| F35 | CSP unsafe-inline/unsafe-eval | `18` | Medium |
| F36 | CSP connect-src too permissive | `18` | Medium |
| F37 | Posts bulk action input validation | `19` | Medium |
| F40 | Open redirect via callbackUrl | `22` | Medium |
| F41 | Mass assignment on post/user create | `22` | Medium |
| F42 | HTTP method confusion | `18` | Low |
| F43 | JWT session verification | `22` | Medium |
| F44 | Deep JSON nesting DoS | `21` | Medium |

---

## Custom Metrics

| Metric | Type | Description |
|---|---|---|
| `errors` | Rate | Overall error rate across all checks |
| `security_failures` | Counter | Security check failures |
| `data_integrity_failures` | Counter | Data consistency failures |
| `performance_violations` | Counter | Latency threshold breaches |
| `rate_limit_429s` | Counter | Rate limit (429) responses received |
| `auth_bypass_attempts` | Counter | Auth bypass detection count |
| `xss_payload_leaks` | Counter | Unsanitized XSS payloads found |
| `injection_leaks` | Counter | SQL error leaks detected |
| `idor_attempts` | Counter | IDOR bypass successes |
| `header_security_failures` | Counter | Missing/incorrect security headers |
| `information_leaks` | Counter | Stack traces, paths, or secrets leaked |
| `api_latency` | Trend | Per-request latency distribution |
| `health_check_latency` | Trend | Health probe latency (soak only) |
| `degradation_events` | Counter | System degradation detected (soak only) |

---

## Output Formats

```bash
# Console (default)
k6 run k6/suites/smoke.js

# JSON output
k6 run k6/suites/smoke.js --out json=results.json

# CSV output
k6 run k6/suites/smoke.js --out csv=results.csv

# InfluxDB (for Grafana dashboards)
k6 run k6/suites/smoke.js --out influxdb=http://localhost:8086/k6

# Grafana Cloud k6
K6_CLOUD_TOKEN=<token> k6 cloud k6/suites/smoke.js
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run k6 smoke tests
  uses: grafana/k6-action@v0.3.1
  with:
    filename: k6/suites/smoke.js
  env:
    BASE_URL: http://localhost:3000
    ADMIN_EMAIL: admin@myblog.com
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

### Docker

```bash
docker run --rm -i \
  --network host \
  -e BASE_URL=http://localhost:3000 \
  grafana/k6 run - < k6/suites/smoke.js
```
