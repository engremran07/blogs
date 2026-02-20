# MyBlog — Full-Stack Blog & CMS Platform

A production-ready, feature-rich blog platform and content management system built with **Next.js 16**, **React 19**, **Prisma 7**, and **PostgreSQL 16**. Includes a complete admin dashboard, rich text editor, SEO engine, ad management, social distribution, media library, CAPTCHA system, background job runner, cookie consent (GDPR), analytics injection, newsletter, and more — deployable on **Vercel** or any **Docker / VPS** host.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.4.0-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![Zod](https://img.shields.io/badge/Zod-4.3.6-3E67B1?logo=zod)
![License](https://img.shields.io/badge/License-Private-red)

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
  - [Route Groups](#route-groups)
  - [Private \_ui Folders](#private-_ui-folders)
  - [Dependency Injection & Wiring](#dependency-injection--wiring)
  - [Typed Prisma Layer](#typed-prisma-layer)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Feature Modules](#feature-modules)
  - [Blog & Content Management](#blog--content-management)
  - [Pages](#pages)
  - [Categories](#categories)
  - [Tags](#tags)
  - [Comments & Moderation](#comments--moderation)
  - [Media Library](#media-library)
  - [Rich Text Editor (TipTap)](#rich-text-editor-tiptap)
  - [SEO Engine](#seo-engine)
  - [Advertising Module](#advertising-module)
  - [Social Distribution](#social-distribution)
  - [CAPTCHA System](#captcha-system)
  - [Newsletter](#newsletter)
  - [Background Job Runner](#background-job-runner)
- [Admin Panel](#admin-panel)
  - [Admin Pages](#admin-pages)
  - [Admin Bar](#admin-bar)
- [Public Pages](#public-pages)
- [Authentication & Authorization](#authentication--authorization)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Capabilities](#capabilities)
- [API Reference](#api-reference)
- [Proxy Layer (Security)](#proxy-layer-security)
- [Cron & Automation](#cron--automation)
- [Settings & Theming](#settings--theming)
  - [Site Settings (~200 Fields)](#site-settings-200-fields)
  - [Menu Builder](#menu-builder)
  - [Theme System](#theme-system)
- [Cookie Consent & GDPR](#cookie-consent--gdpr)
- [Analytics Integration](#analytics-integration)
- [Email System](#email-system)
- [Health Check](#health-check)
- [Testing](#testing)
  - [Vitest (Component / UI)](#vitest-component--ui)
  - [Jest (Server-Side)](#jest-server-side)
  - [Playwright (E2E)](#playwright-e2e)
  - [K6 Load & Security Testing](#k6-load--security-testing)
- [Deployment](#deployment)
  - [Deploy to Vercel](#deploy-to-vercel)
  - [Deploy with Docker (VPS)](#deploy-with-docker-vps)
  - [Production docker-compose](#production-docker-compose)
  - [Self-Hosted PaaS (Coolify / CapRover)](#self-hosted-paas-coolify--caprover)
  - [VPS Provider Recommendations](#vps-provider-recommendations)
- [Prisma Schema (48 Models)](#prisma-schema-48-models)
- [UI Component Library](#ui-component-library)
- [Contributing](#contributing)
- [License](#license)

---

## Features Overview

| Category | Highlights |
| --- | --- |
| **Content Management** | Posts, pages, categories, tags, series, revisions, guest posts, scheduled publishing, password-protected posts, soft delete, bulk operations |
| **Admin Dashboard** | 16-section admin panel with role-based access, cascaded multi-column layouts, module kill switches, responsive sidebar |
| **Rich Text Editor** | TipTap v3 WYSIWYG editor with 28+ extensions (22 packaged + 6 custom), syntax-highlighted code blocks, tables, drag-and-drop images, callouts, columns, pull quotes, task lists, video embeds, typography |
| **SEO Engine** | Per-content scoring (0–100), 21 audit checks, JSON-LD structured data (9 types), dynamic OG image generation (Edge Runtime + Satori), auto-sitemap, robots.txt, keyword tracking, entity graph (knowledge graph), auto-interlinking engine (15 capabilities), SEO redirects (301/302) with hit counting |
| **Media Library** | Grid/list views, folder tree (materialized path), drag-and-drop/paste/URL upload, image optimization (WebP/AVIF via Sharp), bulk operations, content-hash deduplication, S3-compatible storage adapter |
| **Comments** | Threaded comments (nested replies), moderation queue, spam detection (scoring), upvotes/downvotes, guest comments, per-post settings, profanity filter, learning signals (ML), flagging, pin/edit tracking |
| **CAPTCHA** | 5 providers (Cloudflare Turnstile, reCAPTCHA v3, reCAPTCHA v2, hCaptcha, in-house) with automatic fallback chain, per-form toggles, error boundary, lazy script loading |
| **Advertising** | Provider/slot/placement management, 14 ad format components (sticky, interstitial, floating, exit-intent, vignette, video, in-article, in-feed, native recommendation), auto-placement engine, lazy loading, refresh intervals, impression/click/revenue tracking, ads.txt, compliance scanning, global kill switch, consent-gated rendering |
| **Distribution** | 7 social platforms (Twitter/X, Facebook, LinkedIn, Telegram, WhatsApp, Pinterest, Reddit), auto-publish, rate limiting per platform, message style variants, campaign tracking (UTM), credential validation, bulk distribution, white-hat duplicate prevention |
| **Newsletter** | Email subscription, double opt-in confirmation, unsubscribe tokens, digest emails (daily/weekly/monthly) |
| **Job Runner** | DB-backed job queue, 4 multi-step workflow types (SEO Planner, Image Gen, Distribution, Blog Autopublish), idempotency, max 3 attempts, 10s step timeout |
| **Cookie Consent** | GDPR-compliant cookie banner, per-category consent (essential/analytics/marketing), localStorage persistence |
| **Analytics** | Consent-aware GA4 injection, Google Tag Manager, Facebook Pixel, Hotjar, Microsoft Clarity support, conditional script loading, `anonymize_ip` |
| **Authentication** | NextAuth v5 (beta-30), JWT sessions, bcrypt 6 hashing, 6-role hierarchy, capability-based RBAC, custom per-user capabilities, CAPTCHA-protected login/register |
| **Theming** | Dark mode (next-themes), color presets, font selection, custom CSS injection, top bar configuration, announcement banner |
| **Automation** | 21 cron tasks (hourly), distributed lock, per-task timeout, kill-switch per feature, CronLog audit trail |
| **Menus** | Visual menu builder for header/footer/sidebar/top bar, drag-and-drop reordering, nested items, presets |
| **Settings** | ~200 configurable fields across 20+ categories, per-module kill switches, live preview |
| **SEO Redirects** | 301/302 redirect management with hit counting, loaded into Next.js at build time |
| **Email** | Nodemailer SMTP transport, lazy-loaded, auto-rebuilds on config change, digest notifications |
| **Proxy** | CRON secret gate, CSRF validation, rate limiting (30 req/60s), dynamic CSP with per-request nonce |
| **Health Check** | `/api/health` endpoint for Docker HEALTHCHECK, load balancers, uptime monitors |
| **Deployment** | Vercel-ready (`vercel.json` with cron), Docker-ready (multi-stage `Dockerfile` + `docker-compose.yml`), VPS-ready (standalone Node.js ~150 MB) |
| **Testing** | Vitest 4 (163 component tests), Jest 30 (697 server tests), Playwright 1.58 (E2E across 4 browsers + mobile), K6 (25 load/security scenarios) |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js 16.1.6](https://nextjs.org/) — App Router, Turbopack, React Compiler, standalone output |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) — strict mode, zero `any` annotations |
| **UI** | [React 19.2.3](https://react.dev/) with React Compiler, [Tailwind CSS 4](https://tailwindcss.com/), [Headless UI 2](https://headlessui.com/), [Lucide Icons](https://lucide.dev/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) via [Prisma ORM 7.4](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapter — 48 models, 16 enums |
| **Auth** | [NextAuth v5](https://authjs.dev/) (Auth.js beta-30) — Credentials provider, JWT strategy, PrismaAdapter, 6-role RBAC + capabilities |
| **Caching** | [Upstash Redis](https://upstash.com/) (HTTP mode) with in-memory no-op fallback for local dev |
| **Rate Limiting** | [@upstash/ratelimit](https://github.com/upstash/ratelimit) — sliding window, 30 req/60s per IP, fails open if Redis unavailable |
| **Editor** | [TipTap v3](https://tiptap.dev/) — 28+ extensions (22 packaged + 6 custom), ProseMirror-based WYSIWYG |
| **Validation** | [Zod 4.3.6](https://zod.dev/) — schema validation on every API route + environment variables |
| **Security** | bcrypt 6, sanitize-html, HSTS/CSP/X-Frame/X-Content-Type/Permissions-Policy headers, server-only imports, CSRF tokens, CSP nonce |
| **Email** | [Nodemailer 7](https://nodemailer.com/) — SMTP transport, lazy-loaded singleton |
| **AI (optional)** | OpenAI SDK — SEO suggestions, auto-tagging, image generation, content assistance |
| **Testing** | [Vitest 4](https://vitest.dev/), [Jest 30](https://jestjs.io/), [Playwright 1.58](https://playwright.dev/), [K6](https://k6.io/), [axe-core](https://www.deque.com/axe/) |
| **Deployment** | [Vercel](https://vercel.com/) (serverless + cron) or Docker / any VPS (standalone Node.js) |

### Key Dependencies

```text
next 16.1.6              react 19.2.3             prisma 7.4.0
next-auth 5.0.0-beta.30  @upstash/redis 1.36.2    @upstash/ratelimit 2.0.8
zod 4.3.6                bcrypt 6.0.0             nodemailer 7.0.13
@tiptap/react 3.20.0     sanitize-html 2.17.0     next-themes 0.4.6
@headlessui/react 2.2.9  lucide-react 0.564.0     clsx 2.1.1
lowlight 3.3.0           pg 8.18.0                server-only 0.0.1
```

### Dev Dependencies

```text
typescript 5             tailwindcss 4            eslint 9
vitest 4.0.18            jest 30.2.0              @playwright/test 1.58.2
msw 2.12.10              jsdom 28.1.0             tsx 4.21.0
@testing-library/react   @axe-core/playwright     babel-plugin-react-compiler 1.0.0
@vitest/coverage-v8      lcov-result-merger       ts-jest 29.4.6
```

---

## Architecture

### Route Groups

The app uses Next.js route groups for layout separation — zero impact on URL paths:

```
src/app/
├── layout.tsx              ← Root: HTML shell + Providers + AdminBar only
├── (public)/               ← Route group: PublicShell layout + ad slots
│   ├── layout.tsx          ← Header, Footer, TopBar, Sidebar, Ad slots
│   ├── page.tsx            ← /
│   ├── about/              ← /about
│   ├── blog/               ← /blog, /blog/[slug]
│   ├── contact/            ← /contact
│   ├── search/             ← /search
│   ├── tags/               ← /tags, /tags/[slug]
│   └── [slug]/             ← Dynamic CMS pages
├── (auth)/                 ← Route group: PublicShell layout (no ads)
│   ├── layout.tsx          ← PublicShell wrapper
│   ├── login/              ← /login
│   ├── register/           ← /register
│   └── profile/            ← /profile
├── (admin)/                ← Route group: passthrough layout
│   ├── layout.tsx          ← Fragment passthrough
│   └── admin/              ← /admin (auth guard + AdminShell)
│       ├── layout.tsx      ← Auth check + AdminShell sidebar
│       └── ...             ← 16 admin sections
└── api/                    ← 82+ route handlers
```

### Private `_ui/` Folders

Colocated presentational components live in `_ui/` directories (Next.js ignores underscore-prefixed folders for routing):

| `_ui/` Location | Component |
| --- | --- |
| `(public)/blog/[slug]/_ui/` | `CommentSection.tsx` |
| `(public)/contact/_ui/` | `ContactForm.tsx` |
| `(public)/search/_ui/` | `SearchContent.tsx` |
| `(admin)/admin/_ui/` | `AdminShell.tsx` |
| `(admin)/admin/posts/_ui/` | `PostEditor.tsx` |
| `(admin)/admin/pages/_ui/` | `PageEditor.tsx` |

### Dependency Injection & Wiring

All services are instantiated and wired in a single **DI container** at `src/server/wiring/index.ts` (341 lines):

- AuthService, UserService, BlogService, CommentService, ModerationService, SpamService
- TagService, AutocompleteService, AutoTaggingService
- SeoService, PageService, SiteSettingsService, ThemeService, MenuBuilderService
- CaptchaAdminSettingsService, CaptchaVerificationService
- MediaService (with LocalStorageProvider + SharpImageProcessor)
- AdsService, AdsAdminSettingsService
- DistributionService, ConsentService
- Admin settings consumers for config propagation

### Typed Prisma Layer

- **`AppPrismaClient`** — Intersection type wrapping `PrismaClient` to eliminate 33 `as unknown as` casts
- **`PrismaDelegate<T>`** — Generic type for model delegates, eliminating 141 loose `any` annotations
- All Prisma operations are fully type-safe end-to-end

---

## Getting Started

### Prerequisites

| Tool | Version | Required |
| --- | --- | --- |
| **Node.js** | 22+ | Yes |
| **npm** | 10+ | Yes |
| **PostgreSQL** | 16+ | Yes (or use Docker) |
| **Redis** | 7+ | No (falls back to in-memory no-op) |
| **Docker** | 24+ | No (only for containerized deployment) |

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/myblog.git
cd myblog

# 2. Install dependencies
npm install

# 3. Start PostgreSQL + Redis via Docker (recommended)
docker compose up -d postgres redis

# 4. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and AUTH_SECRET

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed the database (optional — creates admin user + sample data)
npm run db:seed

# 7. Start the dev server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the blog is live.
Open [http://localhost:3000/admin](http://localhost:3000/admin) — the admin dashboard.

### Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations (development — creates migration files)
npm run db:migrate

# Push schema directly (skips migration files — useful for prototyping)
npm run db:push

# Open Prisma Studio (visual database browser)
npm run db:studio

# Seed the database with sample data
npm run db:seed
```

---

## Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `DATABASE_URL_UNPOOLED` | No | — | Direct DB connection (bypasses connection pooler, e.g., Supabase/Neon) |
| `AUTH_SECRET` | **Prod** | — | NextAuth v5 secret (≥32 chars in production) |
| `NEXTAUTH_SECRET` | No | — | Legacy alias for `AUTH_SECRET` |
| `NEXTAUTH_URL` | No | — | Canonical auth callback URL (e.g., `https://yourdomain.com`) |
| `NEXT_PUBLIC_SITE_URL` | No | — | Public site URL for OG images, distribution links, sitemap |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | No | — | Server Actions encryption key for VPS rolling deploys (required if multiple instances) |
| `CRON_SECRET` | No | — | Bearer token for `/api/cron` endpoint (prevents unauthorized trigger) |
| **Redis** | | | |
| `UPSTASH_REDIS_REST_URL` | No | — | Upstash Redis REST URL (enables rate limiting + caching) |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | Upstash Redis REST token |
| **AI (Optional)** | | | |
| `OPENAI_API_KEY` | No | — | OpenAI API key for SEO suggestions, auto-tagging, image generation |
| **CAPTCHA** | | | |
| `CLOUDFLARE_TURNSTILE_SECRET` | No | — | Turnstile server verification key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | No | — | Turnstile client site key |
| `RECAPTCHA_SECRET_KEY` | No | — | reCAPTCHA v3 server key |
| `NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY` | No | — | reCAPTCHA v3 client key |
| `RECAPTCHA_V2_SECRET_KEY` | No | — | reCAPTCHA v2 server key |
| `NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY` | No | — | reCAPTCHA v2 client key |
| `HCAPTCHA_SECRET_KEY` | No | — | hCaptcha server key |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | No | — | hCaptcha client key |
| **S3 Storage (Optional)** | | | |
| `S3_BUCKET` | No | — | S3 bucket name |
| `S3_REGION` | No | — | S3 region |
| `S3_ACCESS_KEY_ID` | No | — | S3 access key |
| `S3_SECRET_ACCESS_KEY` | No | — | S3 secret key |
| `S3_ENDPOINT` | No | — | S3-compatible endpoint (MinIO, R2, DigitalOcean Spaces, etc.) |
| `S3_PUBLIC_URL` | No | — | S3 public base URL for serving files |
| **System** | | | |
| `NODE_ENV` | No | `development` | `development` / `production` / `test` |

> **Minimum for local dev**: Only `DATABASE_URL` is required. Everything else has sensible defaults or falls back gracefully.

---

## Available Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `npm run dev` | `next dev --turbopack` | Start dev server with Turbopack (HMR) |
| `npm run build` | `prisma generate && next build` | Production build (generates Prisma client first) |
| `npm start` | `next start` | Start production server |
| `npm run lint` | `eslint` | Run ESLint across the project |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type checking (zero errors) |
| `npm run db:generate` | `prisma generate` | Regenerate Prisma client |
| `npm run db:push` | `prisma db push` | Push schema to DB (no migration) |
| `npm run db:migrate` | `prisma migrate dev` | Create + apply migration |
| `npm run db:studio` | `prisma studio` | Visual database browser |
| `npm run db:seed` | `tsx prisma/seed.ts` | Seed with sample data |
| `npm test` | `vitest run` | Run Vitest component tests (163 tests) |
| `npm run test:watch` | `vitest --watch` | Watch mode |
| `npm run test:ui` | `vitest --ui` | Vitest browser UI |
| `npm run test:coverage` | `vitest run --coverage` | Coverage report (85% threshold) |
| `npm run test:server` | `jest --config jest.config.ts` | Run Jest server tests (697 tests) |
| `npm run test:server:watch` | jest watch mode | Watch mode for server tests |
| `npm run test:server:cov` | jest coverage | Server-side coverage report |
| `npm run e2e` | `playwright test` | Run E2E tests (Chromium, Firefox, WebKit, Mobile) |
| `npm run e2e:ui` | `playwright test --ui` | Playwright UI mode |
| `npm run e2e:headed` | `playwright test --headed` | E2E with visible browser |
| `npm run e2e:debug` | `playwright test --debug` | E2E debug mode |
| `npm run e2e:report` | `playwright show-report` | Open HTML coverage report |

---

## Project Structure

```
myblog/
├── prisma/
│   ├── schema.prisma         # 48 models, 16 enums (1847 lines)
│   ├── seed.ts               # Database seeder
│   └── migrations/           # Migration history
├── src/
│   ├── instrumentation.ts    # OpenTelemetry / observability hook
│   ├── proxy.ts              # Request proxy (CSRF, rate limit, CSP nonce, cron gate)
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (HTML shell + Providers + AdminBar)
│   │   ├── not-found.tsx     # Custom 404 page
│   │   ├── globals.css       # Global styles (Tailwind v4)
│   │   ├── robots.ts         # Dynamic robots.txt
│   │   ├── sitemap.ts        # Dynamic XML sitemap
│   │   ├── (public)/         # Public route group
│   │   ├── (auth)/           # Auth route group
│   │   ├── (admin)/          # Admin route group
│   │   └── api/              # 82+ API route handlers
│   ├── components/
│   │   ├── ui/               # Reusable UI primitives (13 components)
│   │   ├── layout/           # Layout components (7)
│   │   ├── blog/             # Blog-specific components (7)
│   │   └── admin-bar/        # Floating admin bar (12 files)
│   ├── features/             # Feature modules (13 domains)
│   │   ├── ads/              # Ad management
│   │   ├── auth/             # Authentication & users
│   │   ├── blog/             # Blog & content
│   │   ├── captcha/          # CAPTCHA providers
│   │   ├── comments/         # Comments & moderation
│   │   ├── distribution/     # Social distribution
│   │   ├── editor/           # TipTap editor & extensions
│   │   ├── jobs/             # Background job runner
│   │   ├── media/            # Media library
│   │   ├── pages/            # CMS pages
│   │   ├── seo/              # SEO engine
│   │   ├── settings/         # Site settings, menus, themes
│   │   └── tags/             # Tag management
│   ├── server/               # Server infrastructure
│   │   ├── auth.ts           # NextAuth v5 configuration
│   │   ├── api-auth.ts       # Capability-based API route guard
│   │   ├── db/               # Prisma client singleton + types
│   │   ├── cache/            # Redis singleton with no-op fallback
│   │   ├── env/              # Zod-validated environment variables
│   │   ├── mail/             # Nodemailer SMTP transport
│   │   ├── observability/    # Structured JSON logger
│   │   └── wiring/           # DI container (341 lines)
│   ├── shared/               # Shared utilities
│   │   ├── api-response.types.ts
│   │   ├── handle-api-response.ts
│   │   ├── prisma-delegate.types.ts
│   │   ├── sanitize.util.ts
│   │   └── text.util.ts
│   └── types/                # Global TypeScript types
├── tests/
│   ├── vitest/               # Component tests (163 tests)
│   ├── jest/                 # Server-side tests (697 tests)
│   ├── e2e/                  # Playwright E2E specs (8 spec files)
│   └── setup/                # Test configuration & mocks
├── k6/                       # Load & security testing (25 scenarios)
├── docs/                     # Architecture blueprint (HTML)
├── public/uploads/           # User-uploaded files (posts/ + general/)
├── coverage/                 # Test coverage reports
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # PostgreSQL 16 + Redis 7 + App
├── vercel.json               # Vercel cron + function config
├── next.config.ts            # Next.js config (security headers, redirects, standalone)
├── prisma.config.ts          # Prisma configuration
├── vitest.config.ts          # Vitest configuration
├── jest.config.ts            # Jest configuration
├── playwright.config.ts      # Playwright configuration
├── eslint.config.mjs         # ESLint flat config
├── postcss.config.mjs        # PostCSS (Tailwind v4)
└── tsconfig.json             # TypeScript strict config
```

---

## Feature Modules

Each feature module lives in `src/features/<module>/` with a consistent structure:

```
features/<module>/
├── server/          # Service classes, schemas, constants, sanitization
│   ├── <name>.service.ts
│   ├── schemas.ts   # Zod schemas for API validation
│   ├── constants.ts
│   └── sanitization.util.ts
├── ui/              # React components (if applicable)
├── types.ts         # TypeScript interfaces & types
└── ...
```

### Blog & Content Management

**Service**: `blog.service.ts` — Full CRUD for posts with filtering, pagination, bulk operations.

| Feature | Details |
| --- | --- |
| Post statuses | `DRAFT`, `PUBLISHED`, `SCHEDULED`, `ARCHIVED` |
| Revisions | Full revision history with `PostRevision` model (title + content snapshots, change notes) |
| Series | Group posts in `Series` (ACTIVE / COMPLETED / ARCHIVED) |
| Quotes | `PostQuote` model — text, attribution, source, pull-quote flag |
| SEO fields | Per-post: meta title, meta description, OG title/description/image, Twitter card, canonical URL, focus keyword, cornerstone flag |
| Engagement | View count, word count, reading time (auto-calculated) |
| Guest posts | Guest author name, email, URL for external contributors |
| Password protection | Optional password to restrict access to individual posts |
| Locking | Lock a post for editing (prevents concurrent edits) |
| Localization | Locale field for multi-language content |
| Featured / Pinned | Mark posts as featured or pinned to top |
| Scheduled publishing | Set `scheduledAt` — cron auto-publishes at the scheduled time |
| Bulk operations | Bulk publish, unpublish, delete, category/tag assignment |

### Pages

**Service**: `page.service.ts` — CMS pages with hierarchy, templates, custom code injection.

| Feature | Details |
| --- | --- |
| Hierarchy | Parent/child pages with configurable depth |
| Templates | Selectable page templates |
| System pages | `isSystem` flag for protected pages, `isHomePage` for homepage override |
| Visibility | Public, private, password-protected |
| Custom injection | Per-page custom CSS, custom JavaScript, custom `<head>` code |
| Revisions | `PageRevision` model with version history |
| Locking | Concurrent edit prevention |
| Settings | `PageSettings` model: pages per page, lock timeout, max revisions, depth limit, scheduling |

### Categories

**Model**: `Category` — Hierarchical content organization.

| Feature | Details |
| --- | --- |
| Properties | Name, slug, description, color, icon, image |
| Hierarchy | Parent/child with `sortOrder` |
| Counters | `postCount` auto-maintained |
| Featured | Mark categories as featured |
| Bulk ops | Bulk delete, merge via API |

### Tags

**Service**: `tag.service.ts` + `auto-tagging.service.ts` + `autocomplete.service.ts`

| Feature | Details |
| --- | --- |
| Properties | Name, slug, description, color, icon, SEO fields (meta title/description/keywords) |
| Hierarchy | Parent/child tags with tree mode |
| Synonyms | Synonym grouping for related tags |
| Linked tags | Cross-referencing between tags |
| Auto-tagging | LLM-powered automatic tag suggestions (OpenAI) |
| Autocomplete | Fast tag search with configurable min chars, max results |
| Following | `TagFollow` model — users can follow tags with weight |
| Counters | `usageCount`, `featured`, `trending`, `locked`, `protected` flags |
| Settings | `TagSettings`: case sensitivity, max tags per post, cleanup rules |

### Comments & Moderation

**Services**: `comment.service.ts`, `moderation.service.ts`, `spam.service.ts`

| Feature | Details |
| --- | --- |
| Threading | Nested replies via `parentId` |
| Guest comments | `authorName` for unauthenticated visitors |
| Voting | Upvotes/downvotes via `CommentVote` model (keyed by `visitorId`) |
| Spam detection | `spamScore` field, automated spam scoring |
| Moderation | Status workflow: pending → approved / rejected / spam |
| Flagging | `flagCount` with automatic moderation threshold |
| Pinning | Pin important comments to top |
| Edit tracking | `isEdited` flag |
| Learning signals | `LearningSignal` model — action + metadata for ML training |
| Profanity filter | Configurable word list in `CommentSettings` |
| Blocked lists | Block by IP, email, keyword |
| Retention | Auto-cleanup of old spam/deleted comments via cron |
| Settings | `CommentSettings`: content limits, threading depth, voting toggle, moderation mode |

### Media Library

**Service**: `media.service.ts` + `image-processor.ts` + storage adapters

| Feature | Details |
| --- | --- |
| Upload methods | Drag-and-drop, paste, URL import, presigned upload URL |
| Folder system | `MediaFolder` with materialized path (`/photos/2024/vacation`) |
| Image processing | Sharp-based optimization: resize, WebP/AVIF conversion, quality control |
| Variants | JSON field for storing multiple sizes/crops per image |
| Deduplication | Content-hash based (`contentHash` field) |
| Storage backends | `local.adapter.ts` (disk), `s3.adapter.ts` (S3-compatible: AWS, R2, DO Spaces, MinIO) |
| Metadata | Width, height, alt text, title, tags, MIME type, file size |
| Bulk operations | Bulk delete, move, optimize |
| Orphan cleanup | Cron task removes unreferenced files |
| Stats | Storage usage statistics via API |
| Settings | `MediaSetting` model: max upload size, allowed file types, optimization defaults |

### Rich Text Editor (TipTap)

The editor is built with TipTap v3 (ProseMirror-based) and includes 28+ extensions:

**Packaged Extensions (22):**

| Extension | Purpose |
| --- | --- |
| StarterKit | Bold, italic, headings, lists, blockquote, code, hard break |
| BubbleMenu | Floating toolbar on text selection |
| CharacterCount | Live character/word counter |
| CodeBlockLowlight | Syntax-highlighted code blocks (lowlight) |
| Color | Text color picker |
| Dropcursor | Visual drop indicator for drag-and-drop |
| FontFamily | Font family selection |
| Gapcursor | Cursor for gaps between blocks |
| Highlight | Text highlighting with colors |
| Image | Image insertion and management |
| Link | Hyperlink with auto-detect |
| Placeholder | Empty editor placeholder text |
| Subscript | Subscript text |
| Superscript | Superscript text |
| Table + TableCell + TableHeader + TableRow | Full table support (4 extensions) |
| TaskItem + TaskList | Interactive task/checkbox lists |
| TextAlign | Left, center, right, justify alignment |
| TextStyle | Inline text styling foundation |
| Typography | Smart quotes, dashes, ellipsis auto-replacement |
| Underline | Underline text |
| YouTube | YouTube video embeds |

**Custom Extensions (6):**

| Extension | Purpose |
| --- | --- |
| `Callout` | Info, warning, success, error callout boxes |
| `Columns` | Multi-column layouts within content |
| `EditorFigure` | Image with caption, alignment, sizing options |
| `PullQuote` | Stylized pull quotes |
| `StyledSeparator` | Decorative horizontal rules |
| `VideoEmbed` | Generic video embedding |

**Editor Components**: `TipTapEditor.tsx`, `Toolbar.tsx`, `editor.css`

### SEO Engine

**Service**: `seo.service.ts` + 8 utility modules

| Component | Details |
| --- | --- |
| **Audit** | 21 checks: title length, meta description, word count, keyword density, slug optimization, H1/H2 structure, image alt text, internal/external links, content freshness, etc. Severity weights: CRITICAL (15pt), IMPORTANT (10pt), OPTIONAL (5pt). Thresholds: Excellent (90+), Good (70+), Needs Work (50+), Poor (<50) |
| **JSON-LD** | 9 structured data types: `BlogPosting`, `BreadcrumbList`, `WebSite` (with SearchAction), `WebPage`, `FAQPage`, `HowTo`, `Organization`, `Person`, plus serializer helper |
| **Auto-Interlinking** | 15 capabilities: TF-IDF keyword extraction, Jaccard similarity, recency/popularity signals, HTML-safe injection (skips code/blockquote/headings), anchor text diversity, XSS-safe escaping, persistent link tracking, manual overrides (APPROVED/REJECTED), exclusion rules (phrase/target/source/pair), auto-scan on create/update, broken link repair, slug change detection, smart cron batching, idempotent injection, hub/authority analysis |
| **Entity Graph** | Knowledge graph with `SeoEntity` (6 types: CATEGORY, TAG, TOPIC, BRAND, PERSON, LOCATION) and `SeoEntityEdge` (5 relation types: CO_OCCURRENCE, HIERARCHY, SYNONYM, RELATED, PARENT_CHILD) with weighted edges |
| **Keyword Tracking** | `SeoKeyword` model: term, slug, intent classification (transactional/local/commercial/navigational/informational), volume, competition, CPC. `SeoKeywordHistory` for trend tracking |
| **Redirects** | `SeoRedirect` model: fromPath → toPath, statusCode (301/302), hitCount, isActive. Loaded into `next.config.ts` `redirects()` at build time |
| **Suggestions** | `SeoSuggestion` model: targetType/Id, category, severity, status (PENDING/APPLIED/DISMISSED), source (AUDIT/AI/MANUAL/RULE_ENGINE), proposed changes JSON, autoApply flag |
| **Batch Operations** | `BatchOperation` model for bulk SEO updates |
| **OG Images** | Dynamic OG image generation via `/api/og` (Edge Runtime + Satori) |
| **robots.ts** | Dynamic `robots.txt` generation |
| **sitemap.ts** | Dynamic XML sitemap with all posts, pages, tags, categories |
| **Power Words** | Emotional trigger analysis, intent pattern matching |

### Advertising Module

**Service**: `ads.service.ts` + `admin-settings.service.ts`

| Component | Details |
| --- | --- |
| **Providers** | `AdProvider` model: name, type, clientId, publisherId, apiKey, scriptUrl, global kill switch, supported formats, load strategy |
| **Slots** | `AdSlot` model: position, format, responsiveSizes JSON, page type targeting, category targeting, multi-provider support |
| **Placements** | `AdPlacement` model: provider→slot mapping, ad unit ID, custom HTML, auto-placement config (paragraph-count strategy), lazy loading, refresh interval, closeable, scheduling (startDate/endDate), impression/click/revenue tracking |
| **Analytics** | `AdLog` model: event tracking (impressions, clicks, viewability), revenue aggregation |
| **Settings** | `AdSettings` model: sanitization rules, lazy load defaults, auto-placement engine config, analytics toggle, compliance scanning, ads.txt content, consent integration, responsive breakpoints, viewport coverage limits |

**14 Ad Format Components:**

| Component | Format |
| --- | --- |
| `AdContainer` | Generic wrapper with providers |
| `AdRenderer` | Provider-specific rendering |
| `ExitIntentAd` | Triggered on mouse exit |
| `FloatingAd` | Floating overlay |
| `GlobalAdSlots` | Global slot injection |
| `GlobalOverlayAds` | Full-screen overlays |
| `InArticleAd` | Between content paragraphs |
| `InFeedAdCard` | In listing/feed cards |
| `InterstitialAd` | Full-page interstitial |
| `NativeRecommendationAd` | Native content recommendations |
| `ReservedAdSlot` | Pre-defined position |
| `StickyAd` | Sticky/fixed position |
| `VideoAd` | Video ad player |
| `VignetteAd` | Vignette overlay |

**API Endpoints (15):** providers CRUD, slots CRUD, placements CRUD, placement stats, event tracking, overview dashboard, settings, global kill switch, compliance scanning, page type auto-detection, ads.txt, reserved slots.

### Social Distribution

**Service**: `distribution.service.ts` + `connectors.ts` (7 platform connectors)

| Platform | Max Chars | Features |
| --- | --- | --- |
| **Twitter/X** | 280 | OAuth 1.0a, HMAC-SHA1 signing, link preview, scheduling |
| **Facebook** | 63,206 | Images, link preview, scheduling |
| **LinkedIn** | 3,000 | Images, link preview |
| **Telegram** | 4,096 | Bot API, HTML parse mode, real connector |
| **WhatsApp** | 4,096 | Images, link preview |
| **Pinterest** | 500 | Images, hashtags (up to 20), scheduling |
| **Reddit** | 40,000 | Images, link preview |

| Feature | Details |
| --- | --- |
| Rate limiting | Per-platform rate limits enforced |
| White-hat policy | Duplicate prevention, cooldowns, daily limits |
| Message styles | 4 variants: CONCISE, PROFESSIONAL, CASUAL, PROMOTIONAL |
| Campaign tracking | Automatic UTM parameter injection |
| Credential validation | API endpoint to test channel credentials |
| Bulk distribution | Distribute to multiple channels in one call |
| Auto-publish | Trigger distribution on post creation/publish |
| Kill switch | Global and per-channel distribution toggle |
| Health monitoring | Connector health endpoint |

**API Endpoints (11):** channels CRUD, credential validation, trigger distribution, distribution records, post history, settings, kill switch, health, stats, bulk distribute.

### CAPTCHA System

**Services**: `verification.service.ts` + `admin-settings.service.ts`

| Provider | Component | Script Source |
| --- | --- | --- |
| Cloudflare Turnstile | `CloudflareTurnstile.tsx` | challenges.cloudflare.com |
| Google reCAPTCHA v3 | `RecaptchaV3.tsx` | google.com/recaptcha |
| Google reCAPTCHA v2 | `RecaptchaV2.tsx` | google.com/recaptcha |
| hCaptcha | `HCaptcha.tsx` | js.hcaptcha.com |
| In-house (custom) | `InhouseCaptcha.tsx` | Self-hosted challenge/response |

**Architecture:**
- `CaptchaOrchestrator.tsx` — Manages provider selection, fallback chain, error boundary
- Lazy script loading with configurable timeout
- Per-form toggles: login, register, comments, contact, password reset, newsletter
- `CaptchaSettings` model: enabled, mode, defaultProvider, fallback chain, per-provider toggle, site/secret keys, lockout config, theme
- `CaptchaAttempt` model: client IP, provider, success, score (for analytics)
- `CaptchaChallenge` model: answer, expiry, max attempts (in-house provider)

**API Endpoints (3):** challenge generation, token verification, settings management.

### Newsletter

| Feature | Details |
| --- | --- |
| Subscribe | Email + name collection |
| Double opt-in | Confirmation email with token |
| Unsubscribe | Token-based one-click unsubscribe |
| Model | `NewsletterSubscriber`: email, name, confirmed, confirmToken, unsubscribeToken |
| Digest | Configurable digest frequency (daily/weekly/monthly) via cron |

**API Endpoints (3):** subscribe, confirm, unsubscribe.

### Background Job Runner

**Module**: `src/features/jobs/` — DB-backed job queue with multi-step workflows.

| File | Purpose |
| --- | --- |
| `queue.ts` | DB-backed job queue (enqueue, dequeue, status updates) |
| `runner.ts` | Step-by-step workflow executor |
| `dispatcher.ts` | Routes jobs to the correct workflow handler |
| `idempotency.ts` | Prevents duplicate job execution |
| `definitions.ts` | Job type definitions and step schemas |
| `types.ts` | TypeScript interfaces |

**4 Workflow Types:**

| Workflow | Steps | Purpose |
| --- | --- | --- |
| `SEO_PLANNER` | analyze → research → score → suggest | SEO analysis & suggestion generation |
| `IMAGE_GEN` | extract → prompt → generate → store | AI-powered featured image generation |
| `DISTRIBUTION` | select-targets → format → distribute → verify | Social media distribution pipeline |
| `BLOG_AUTOPUBLISH` | select → validate → publish → notify | Auto-publish scheduled content |

**Configuration:** Max 3 attempts per job, 10-second step timeout, `Job` model with type/step/status/payload/result/error/attempts fields.

**API Endpoints (2):** `POST /api/jobs/enqueue` (queue a job), `POST /api/jobs/run` (process next job in queue).

---

## Admin Panel

### Admin Pages

| Route | Page | Features |
| --- | --- | --- |
| `/admin` | **Dashboard** | Overview stats, recent activity |
| `/admin/posts` | **Posts** | Data table with search, filters, bulk actions, status badges |
| `/admin/posts/new` | **New Post** | TipTap editor, SEO panel, categories/tags, scheduling, featured image |
| `/admin/posts/[id]/edit` | **Edit Post** | Same as new + revision history, lock management |
| `/admin/pages` | **Pages** | Page list with hierarchy, bulk operations |
| `/admin/pages/new` | **New Page** | TipTap editor, template selection, custom code injection |
| `/admin/pages/[id]/edit` | **Edit Page** | Same as new + revision history |
| `/admin/categories` | **Categories** | Hierarchical tree, color/icon, bulk operations |
| `/admin/tags` | **Tags** | Tag management, synonyms, auto-tagging config |
| `/admin/comments` | **Comments** | Moderation queue, spam review, bulk approve/reject/delete |
| `/admin/media` | **Media Library** | Grid/list toggle, folder tree, upload, optimize, bulk actions |
| `/admin/menus` | **Menu Builder** | Visual drag-and-drop menu editor for all positions |
| `/admin/users` | **Users** | User table, cascaded multi-column add/edit modal with role picker + custom capabilities |
| `/admin/ads` | **Ads** | Provider/slot/placement management, analytics, kill switch |
| `/admin/distribution` | **Distribution** | Channel management, distribution records, health monitoring |
| `/admin/seo` | **SEO Dashboard** | SEO suggestions, keyword tracking, entity graph, redirects, interlinking |
| `/admin/seo/fix/[id]` | **Fix SEO Issue** | Individual suggestion detail + apply/dismiss |
| `/admin/cron` | **Cron Logs** | Cron run history, status, timing, errors |
| `/admin/settings` | **Settings** | ~200 fields across 20+ tabs |
| `/admin/settings/admin-bar` | **Admin Bar Config** | 15+ toggles for admin bar customization |

### Admin Bar

A floating admin bar appears on all pages for authenticated admins:

| Component | Purpose |
| --- | --- |
| `AdminBar` | Main bar container |
| `AdminBarProvider` | Context provider for bar state |
| `LeftZone` | Breadcrumbs, new content button, SEO score |
| `ContextZone` | Page-specific actions (status toggle, word count) |
| `RightZone` | Save/publish/preview/view buttons |
| `NewDropdown` | Quick-create post/page/category/tag |
| `SeoDropdown` | Live SEO score with drill-down |
| `SiteNameDropdown` | Quick links to admin sections |
| `UserDropdown` | Profile, settings, logout |
| `usePageMeta` | Hook for current page metadata |
| `useRouteIntelligence` | Hook for route-aware context |

**Configurable via admin settings:** breadcrumbs toggle, new button, SEO score, status toggle, word count, save/publish/preview/view buttons, site name dropdown, user dropdown, environment badge, custom colors.

---

## Public Pages

| Route | Page | Features |
| --- | --- | --- |
| `/` | **Homepage** | Latest posts, featured content, sidebar widgets |
| `/blog` | **Blog Listing** | Paginated post grid/list (configurable layout), loading skeleton |
| `/blog/[slug]` | **Single Post** | Full content, table of contents, social sharing, related posts, comments, post navigation, loading/error states |
| `/about` | **About** | Static about page |
| `/contact` | **Contact** | Contact form with CAPTCHA integration |
| `/search` | **Search** | Full-text search with results |
| `/tags` | **Tag Listing** | All tags with post counts, loading skeleton |
| `/tags/[slug]` | **Posts by Tag** | Filtered post listing |
| `/[slug]` | **CMS Pages** | Dynamic pages served from the database |

**Additional routes:**
- `robots.ts` — Dynamic robots.txt
- `sitemap.ts` — Dynamic XML sitemap
- `not-found.tsx` — Custom 404 page

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

6-tier role hierarchy where each role inherits all permissions of lower roles:

```
SUBSCRIBER → CONTRIBUTOR → AUTHOR → EDITOR → ADMINISTRATOR → SUPER_ADMIN
```

| Role | Access Level |
| --- | --- |
| `SUBSCRIBER` | Read content, manage own profile |
| `CONTRIBUTOR` | Create drafts, edit own posts |
| `AUTHOR` | Publish own posts, upload files |
| `EDITOR` | Edit/delete any content, manage categories/tags, moderate comments |
| `ADMINISTRATOR` | Manage users, settings, themes, all content operations |
| `SUPER_ADMIN` | Full system access, all capabilities, cannot be deleted |

### Capabilities

23 granular capabilities for fine-grained access control:

| Category | Capabilities |
| --- | --- |
| **Reading** | `read_posts`, `read_comments` |
| **Profile** | `edit_profile` |
| **Content** | `create_posts`, `edit_own_posts`, `delete_own_posts`, `publish_posts` |
| **Media** | `upload_files` |
| **Editorial** | `edit_posts`, `edit_others_posts`, `delete_posts`, `delete_others_posts` |
| **Taxonomy** | `manage_categories`, `manage_tags` |
| **Moderation** | `moderate_comments` |
| **Admin** | `manage_users`, `create_users`, `edit_users`, `delete_users`, `manage_settings`, `manage_pages` |
| **Theme** | `edit_theme`, `install_plugins` |

**Custom capabilities** can be granted per-user via the `customCapabilities` array, adding capabilities _on top_ of the role's baseline without changing the role.

### Auth Configuration

| Setting | Value |
| --- | --- |
| Provider | Credentials (email/password) |
| Strategy | JWT (stateless) |
| Adapter | PrismaAdapter |
| Hashing | bcrypt 6 (configurable rounds via UserSettings) |
| Session | `UserSession` model: refresh token hash, user agent, IP, expiry, revocation |
| Email verification | `EmailVerificationToken` model with code hash + expiry |
| Email change | `EmailChangeRequest` model with dual-code verification + admin approval |
| CAPTCHA | Integrated into login/register flows |

---

## API Reference

### Auth (2 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `*` | `/api/auth/[...nextauth]` | NextAuth v5 handlers (login, logout, session, CSRF) |
| `POST` | `/api/auth/register` | User registration |

### Posts (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/posts` | List posts (filtered, paginated) / Create post |
| `GET, PATCH, DELETE` | `/api/posts/[id]` | Get / Update / Delete single post |
| `POST` | `/api/posts/bulk` | Bulk operations (publish, unpublish, delete) |

### Pages (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/pages` | List / Create pages |
| `GET, PATCH, DELETE` | `/api/pages/[id]` | Get / Update / Delete single page |
| `POST` | `/api/pages/bulk` | Bulk operations |

### Comments (5 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/comments` | List / Create comments |
| `PATCH, DELETE` | `/api/comments/[id]` | Update / Delete comment |
| `POST` | `/api/comments/[id]/vote` | Upvote or downvote |
| `POST` | `/api/comments/[id]/flag` | Flag comment |
| `POST` | `/api/comments/bulk` | Bulk moderation |

### Tags (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/tags` | List / Create tags |
| `GET, PATCH, DELETE` | `/api/tags/[id]` | Get / Update / Delete tag |
| `POST` | `/api/tags/bulk` | Bulk operations |

### Categories (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/categories` | List / Create categories |
| `GET, PATCH, DELETE` | `/api/categories/[id]` | Get / Update / Delete category |
| `POST` | `/api/categories/bulk` | Bulk operations |

### Media (10 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/media` | List / Upload media |
| `GET, PATCH, DELETE` | `/api/media/[id]` | Get / Update / Delete media |
| `POST` | `/api/media/bulk` | Bulk operations |
| `GET, POST` | `/api/media/folders` | List / Create folders |
| `GET, PATCH, DELETE` | `/api/media/folders/[id]` | Get / Update / Delete folder |
| `POST` | `/api/media/optimize` | Trigger image optimization |
| `POST` | `/api/media/upload-url` | Generate presigned upload URL |
| `POST` | `/api/media/cleanup` | Cleanup orphaned files |
| `GET` | `/api/media/stats` | Storage statistics |
| `POST` | `/api/upload` | Direct file upload |

### SEO (2 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST, PATCH` | `/api/seo` | SEO operations (suggestions, audit, batch) |
| `GET, POST, DELETE` | `/api/seo/redirects` | Redirect management |

### Ads (15 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/ads/providers` | List / Create ad providers |
| `GET, PATCH, DELETE` | `/api/ads/providers/[id]` | Provider CRUD |
| `POST` | `/api/ads/providers/[id]/kill-switch` | Per-provider kill switch |
| `GET, POST` | `/api/ads/slots` | List / Create ad slots |
| `GET, PATCH, DELETE` | `/api/ads/slots/[id]` | Slot CRUD |
| `GET, POST` | `/api/ads/placements` | List / Create placements |
| `GET, PATCH, DELETE` | `/api/ads/placements/[id]` | Placement CRUD |
| `GET` | `/api/ads/placements/[id]/stats` | Placement analytics |
| `POST` | `/api/ads/events` | Track impressions/clicks |
| `GET` | `/api/ads/overview` | Dashboard overview |
| `GET, PATCH` | `/api/ads/settings` | Ad settings |
| `POST` | `/api/ads/kill-switch` | Global kill switch |
| `GET` | `/api/ads/compliance` | Compliance scanning |
| `POST` | `/api/ads/scan-pages` | Auto-detect page types |
| `GET` | `/api/ads/ads-txt` | ads.txt content |
| `GET` | `/api/ads/reserved-slots` | Pre-defined slot list |

### Distribution (11 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, POST` | `/api/distribution/channels` | List / Create channels |
| `GET, PATCH, DELETE` | `/api/distribution/channels/[id]` | Channel CRUD |
| `POST` | `/api/distribution/channels/[id]/validate` | Validate credentials |
| `POST` | `/api/distribution/distribute` | Trigger distribution |
| `GET` | `/api/distribution/records` | List records |
| `GET` | `/api/distribution/records/[id]` | Single record |
| `GET` | `/api/distribution/posts/[postId]` | Post distribution history |
| `GET, PATCH` | `/api/distribution/settings` | Distribution settings |
| `POST` | `/api/distribution/kill-switch` | Kill switch |
| `GET` | `/api/distribution/health` | Connector health |
| `GET` | `/api/distribution/stats` | Distribution statistics |
| `POST` | `/api/distribution/bulk` | Bulk distribute |

### CAPTCHA (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/captcha/challenge` | Generate in-house challenge |
| `POST` | `/api/captcha/verify` | Verify CAPTCHA token |
| `GET, PATCH` | `/api/captcha/settings` | CAPTCHA settings |

### Newsletter (3 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/newsletter/subscribe` | Subscribe email |
| `GET` | `/api/newsletter/confirm` | Confirm double opt-in |
| `GET` | `/api/newsletter/unsubscribe` | Unsubscribe |

### Settings (5 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, PATCH` | `/api/settings` | All settings |
| `GET, PATCH` | `/api/settings/[group]` | Settings by group |
| `GET` | `/api/settings/public` | Public-facing settings (no auth required) |
| `POST` | `/api/settings/test-email` | Send test email |
| `GET` | `/api/settings/module-status` | Feature module status |

### Users (2 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, PATCH` | `/api/users` | List users / Update user (role, profile, capabilities) |
| `POST` | `/api/users/bulk` | Bulk operations (delete, change role) |

### Profile (2 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET, PATCH` | `/api/profile` | Current user profile |
| `POST` | `/api/profile/password` | Change password |

### Jobs (2 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/jobs/enqueue` | Enqueue a background job |
| `POST` | `/api/jobs/run` | Process next job in queue |

### Other (5 routes)

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/cron` | Hourly cron endpoint (21 tasks) |
| `GET` | `/api/cron/history` | Cron run history |
| `POST` | `/api/contact` | Contact form submission |
| `GET` | `/api/health` | Health check (returns `{ status: "ok" }`) |
| `GET` | `/api/og` | Dynamic OG image generation (Edge Runtime) |
| `GET` | `/api/admin-bar/meta` | Admin bar page metadata |
| `POST` | `/api/revalidate` | On-demand ISR revalidation |

---

## Proxy Layer (Security)

The app uses `src/proxy.ts` (Next.js `proxy` — _not_ middleware) as the security gateway. It runs before every matched request:

| Layer | What It Does |
| --- | --- |
| **CRON Secret Gate** | Verifies `x-cron-secret` header or `Bearer` token on `/api/cron`. Rejects unauthorized trigger attempts with `401`. |
| **CSRF Validation** | Validates `x-csrf-token` header matches `csrf_token` cookie on all mutation API routes (`POST`, `PUT`, `PATCH`, `DELETE`). Skips auth, cron, contact, newsletter, captcha, ads events, health, public settings. Client-side `CsrfFetchInterceptor.tsx` auto-injects tokens. |
| **Rate Limiting** | Upstash Redis sliding window: 30 requests / 60 seconds per IP on mutation API routes. Fails open if Redis is unavailable (never blocks legitimate traffic). Returns `429` with `Retry-After` header when exceeded. |
| **CSP Nonce** | Generates a unique per-request nonce and injects `Content-Security-Policy` header: `script-src 'nonce-...' 'strict-dynamic'`. Allows Cloudflare, Google, and hCaptcha scripts via nonce propagation. |

> **Note:** Next.js 16 uses `proxy.ts` instead of `middleware.ts`. The proxy runs on every request (not just edge routes) and has full access to headers, cookies, and the request body.

---

## Cron & Automation

Cron runs hourly via `/api/cron` — triggered by Vercel Cron or external scheduler (cURL, systemd timer, etc.).

### 21 Cron Tasks

| # | Task | Purpose |
| --- | --- | --- |
| 1 | Publish scheduled posts | Auto-publish posts where `scheduledAt` has passed |
| 2 | Publish scheduled pages | Auto-publish pages where `scheduledAt` has passed |
| 3 | Release stale locks | Unlock posts/pages locked longer than timeout |
| 4 | Cleanup orphaned tags | Remove tags with zero usage |
| 5 | SEO keyword history cleanup | Prune old keyword volume snapshots |
| 6 | Media orphan cleanup | Remove unreferenced media files |
| 7 | Media purge deleted | Permanently delete soft-deleted media |
| 8 | Spam comment purge | Delete spam comments older than retention period |
| 9 | Deleted comment purge | Permanently delete soft-deleted comments |
| 10 | CAPTCHA attempt cleanup | Prune old CAPTCHA attempt records |
| 11 | Ad log purge | Remove old impression/click logs |
| 12 | Deactivate expired placements | Disable ad placements past their end date |
| 13 | Process scheduled distributions | Execute pending social media distributions |
| 14 | Cleanup old distribution records | Prune completed distribution records |
| 15 | Sync ad slot page types | Auto-detect and update page type targeting |
| 16 | SEO bulk enhance | Batch SEO improvements |
| 17 | SEO auto-interlink | Run interlinking engine across content |
| 18 | SEO generate suggestions | Generate new SEO suggestions |
| 19 | Cleanup expired sessions | Remove expired `UserSession` records |
| 20 | Cleanup expired tokens | Remove expired verification/email-change tokens |
| 21 | Send newsletter digest | Send periodic newsletter digest |

### Safety Mechanisms

| Mechanism | Details |
| --- | --- |
| **Distributed lock** | `CronLock` table prevents concurrent execution (lockedAt, expiresAt, holder) |
| **Per-task timeout** | Each task has a 30-second timeout |
| **Kill switches** | Feature-specific kill switches skip tasks for disabled modules |
| **Audit trail** | `CronLog` model: status, summary, results JSON, durationMs, triggeredBy |
| **Structured logging** | JSON-formatted logs via `createLogger('cron')` |
| **Process job queue** | Cron also triggers background job processing |

---

## Settings & Theming

### Site Settings (~200 Fields)

All settings are stored in the `SiteSettings` model and managed via the admin panel:

| Category | Key Fields |
| --- | --- |
| **Identity** | siteName, siteTagline, siteDescription, siteUrl, logoUrl, logoDarkUrl, faviconUrl, language, timezone |
| **Appearance / Theme** | primaryColor, secondaryColor, accentColor, fontFamily, headingFontFamily, darkModeEnabled, darkModeDefault, customCss, themeColor |
| **Date & Locale** | dateFormat, timeFormat, currencyCode, currencySymbol |
| **Top Bar** | enabled, phone, email, address, text, socialLinks, businessHours, colors, CTA button, dismissible |
| **Announcement Banner** | enabled, text, type (info/warning/success/error), url, dismissible, backgroundColor |
| **Navigation / Header** | headerStyle (static/sticky/fixed), search, language switcher, dark mode toggle |
| **Menu & Theme** | menuStructure (JSON), themeConfig (JSON) |
| **Footer** | text, socialLinks, contactInfo, secondaryText |
| **Social Links** | 10 platforms: Facebook, Twitter/X, Instagram, LinkedIn, YouTube, WhatsApp, TikTok, Telegram, GitHub, Pinterest |
| **Contact** | email, phone, address |
| **SEO Defaults** | titleTemplate, defaultImage, Google/Bing/Yandex/Pinterest/Baidu verification codes, Google Analytics ID |
| **CAPTCHA** | Provider selection, site/secret keys, per-form toggles, scoring thresholds |
| **Reading / Content** | postsPerPage, excerptLength, RSS toggle, comments toggle, search toggle, registration toggle, defaultPostStatus |
| **Blog Layout** | layout (grid/list/masonry), columns (1–4), show flags: author, date, updatedDate, readTime, tags, image, excerpt, viewCount |
| **Sidebar** | enabled, position (left/right), widgets: search, recent posts, categories, tags, archive |
| **Single Post** | relatedPosts, socialSharing, tableOfContents, postNavigation, comment display settings |
| **Privacy & Legal** | cookieConsentEnabled, GDPR toggle, privacyPolicyUrl, termsOfServiceUrl |
| **Email / SMTP** | fromName, fromAddress, replyTo, SMTP host/port/user/password/secure, notification toggles, digest frequency |
| **Third-Party** | Google Tag Manager, Facebook Pixel, Hotjar, Microsoft Clarity |
| **Media** | maxUploadSizeMb, allowedFileTypes, imageOptimization settings |
| **PWA** | enabled, name, shortName, themeColor, backgroundColor |
| **Robots / Crawling** | Custom robots.txt content, sitemapEnabled, changeFreq |
| **Maintenance Mode** | enabled, message, allowedIps |
| **Custom Code** | customHeadCode, customFooterCode (injected into HTML) |
| **Kill Switches** | adsEnabled, distributionEnabled, distributionConfig JSON |
| **Admin Bar** | 15+ toggles: breadcrumbs, new button, SEO score, status toggle, word count, save/publish/preview/view buttons, site name dropdown, user dropdown, env badge, custom colors |

### Menu Builder

Visual drag-and-drop menu builder with:

| Feature | Details |
| --- | --- |
| Positions | Header navbar, footer, sidebar, top bar |
| Nesting | Multi-level nested menu items |
| Presets | Pre-built menu configurations |
| Components | `Navbar`, `Footer`, `Sidebar`, `TopBar`, `MenuManagementPage`, `MenuContext` |
| Service | `menu-builder.service.ts`, `menu-presets.ts`, `menu-structure.ts` |

### Theme System

| Feature | Details |
| --- | --- |
| Dark mode | `next-themes` integration with system preference detection |
| Color presets | Primary, secondary, accent colors |
| Font selection | Body font + heading font |
| Custom CSS | Global custom CSS injection via settings |
| Theme service | `theme.service.ts` managing theme state |

---

## Cookie Consent & GDPR

| Feature | Details |
| --- | --- |
| Banner | `CookieConsentBanner` component — appears on first visit |
| Categories | Essential (always on), Analytics, Marketing |
| Storage | Consent state persisted in `localStorage` |
| GDPR | `ConsentLog` model: userId, email, consentType, granted, ipAddress, userAgent, timestamp |
| Integration | Analytics scripts only load when consent is granted |
| Settings | Toggleable via `SiteSettings.cookieConsentEnabled` |

---

## Analytics Integration

| Platform | Integration |
| --- | --- |
| **Google Analytics 4** | Consent-aware injection, `anonymize_ip`, configurable tracking ID |
| **Google Tag Manager** | Container ID injection in `<head>` |
| **Facebook Pixel** | Pixel ID with consent gating |
| **Hotjar** | Site ID injection |
| **Microsoft Clarity** | Project ID injection |

All scripts are loaded via `AnalyticsScripts` component, which:
- Checks cookie consent before injecting
- Uses `next/script` with appropriate loading strategy
- Configurable via admin settings

---

## Email System

| Feature | Details |
| --- | --- |
| Transport | Nodemailer SMTP (lazy-loaded singleton, auto-rebuilds on config change) |
| Configuration | SMTP host, port, user, password, secure flag — all via admin settings |
| Emails | Welcome email on registration, admin notification on new user, contact form notifications, newsletter digest, email verification codes |
| Test | `/api/settings/test-email` endpoint to verify SMTP configuration |
| Settings | fromName, fromAddress, replyTo, notification toggles per event |

---

## Health Check

```
GET /api/health → { "status": "ok" }
```

Used by:
- Docker `HEALTHCHECK` (every 30s, 10s timeout, 3 retries)
- Load balancers (AWS ALB, Nginx, Caddy)
- Uptime monitors (UptimeRobot, Better Uptime, etc.)
- Kubernetes readiness/liveness probes

---

## Testing

### Vitest (Component / UI)

| Setting | Value |
| --- | --- |
| Framework | Vitest 4.0.18 |
| Environment | jsdom |
| Tests | `tests/vitest/**/*.test.{ts,tsx}` |
| Count | **163 tests** |
| Coverage | v8 provider, thresholds: 85% lines/statements, 80% branches/functions |
| Targets | `src/components/**`, `src/features/**/ui/**`, `src/shared/**` |

```bash
npm test                # Run all component tests
npm run test:watch      # Watch mode
npm run test:ui         # Browser UI
npm run test:coverage   # Coverage report
```

### Jest (Server-Side)

| Setting | Value |
| --- | --- |
| Framework | Jest 30.2.0 |
| Environment | Node (ESM mode via `--experimental-vm-modules`) |
| Tests | `tests/jest/**/*.test.ts` |
| Count | **697 tests** (19 suites) |
| Coverage | v8 provider, same 85/80 thresholds |
| Targets | `src/features/**/server/**`, `src/app/api/**`, `src/server/**`, `src/proxy.ts` |
| Mocking | MSW 2.12.10 for API mocking |

```bash
npm run test:server       # Run all server tests
npm run test:server:watch # Watch mode
npm run test:server:cov   # Coverage report
```

### Playwright (E2E)

| Setting | Value |
| --- | --- |
| Framework | Playwright 1.58.2 |
| Browsers | Chromium, Firefox, WebKit, Mobile Chrome (Pixel 7) |
| Specs | 8 spec files: about, accessibility, auth, blog, contact, navigation, search, seo |
| Reporters | HTML, JUnit, list |
| Artifacts | Video, trace, screenshots on failure/retry |
| A11y | axe-core integration via `@axe-core/playwright` |

```bash
npm run e2e          # Run E2E tests (headless)
npm run e2e:ui       # Playwright UI mode
npm run e2e:headed   # Run with visible browser
npm run e2e:debug    # Debug mode
npm run e2e:report   # Open HTML report
```

### K6 Load & Security Testing

25 scenarios covering load performance and security:

| # | Scenario | Category |
| --- | --- | --- |
| 01 | Auth Flow | Security |
| 02 | IDOR Protection | Security |
| 03 | XSS Injection | Security |
| 04 | SQL Injection | Security |
| 05 | Rate Limiting | Security |
| 06 | CSRF Validation | Security |
| 07 | Enumeration Leaks | Security |
| 08 | File Upload | Security |
| 09 | Role Escalation | Security |
| 10 | Input Validation | Security |
| 11 | Cache Poisoning | Security |
| 12 | Pagination Bombs | Performance |
| 13 | Race Conditions | Reliability |
| 14 | Slug Collision | Reliability |
| 15 | Interlink Lifecycle | SEO |
| 16 | Health Degradation | Performance |
| 17 | SEO Audit | Performance |
| 18 | Security Headers | Security |
| 19 | Access Control Gaps | Security |
| 20 | Information Disclosure | Security |
| 21 | DoS Patterns | Performance |
| 22 | Mass Assignment | Security |
| 23 | Newsletter Lifecycle | Functional |
| 24 | Distribution Security | Security |
| 25 | Contact Form | Functional |

**Suites**: smoke, load, stress, soak, regression

```bash
# Run via helper scripts
./k6/run.sh smoke     # Quick smoke test
./k6/run.sh load      # Standard load test
./k6/run.sh stress    # Stress test
./k6/run.sh soak      # Long-running soak test
```

---

## Deployment

### Deploy to Vercel

Vercel is the recommended deployment for zero-config hosting:

#### 1. Connect Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel auto-detects Next.js — no configuration needed

#### 2. Set Environment Variables

In your Vercel project settings → Environment Variables, add:

```env
# Required
DATABASE_URL=postgresql://user:password@host:5432/myblog?sslmode=require

# Required for production
AUTH_SECRET=your-secret-at-least-32-characters-long

# Recommended
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
CRON_SECRET=your-cron-secret-token

# Optional: Redis for rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: CAPTCHA (pick one or more)
CLOUDFLARE_TURNSTILE_SECRET=your-secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-site-key
```

#### 3. Database Providers (Recommended)

| Provider | Free Tier | Connection |
| --- | --- | --- |
| [Neon](https://neon.tech) | 512 MB, auto-suspend | Serverless driver, connection pooling |
| [Supabase](https://supabase.com) | 500 MB, 2 projects | Direct + pooled connection strings |
| [Railway](https://railway.app) | $5/month credit | Standard PostgreSQL |
| [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) | Powered by Neon | Native integration |

> **Tip:** Use `DATABASE_URL` for the pooled connection and `DATABASE_URL_UNPOOLED` for migrations.

#### 4. Cron Configuration

The included `vercel.json` configures:

```json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }],
  "functions": {
    "src/app/api/cron/route.ts": { "maxDuration": 60 },
    "src/app/api/upload/route.ts": { "maxDuration": 30 }
  }
}
```

- Cron runs every hour — handles all 21 automated tasks
- Cron function gets 60 seconds (vs default 10s)
- Upload function gets 30 seconds for large files

#### 5. Custom Domain

1. Vercel Dashboard → Settings → Domains
2. Add your domain and configure DNS:
   - `A` record → `76.76.21.21`
   - `CNAME` for `www` → `cname.vercel-dns.com`
3. SSL is automatic (Let's Encrypt)

#### 6. Vercel-Specific Features

| Feature | Status |
| --- | --- |
| Edge Runtime | OG image generation (`/api/og`) |
| Serverless Functions | All API routes |
| ISR | On-demand revalidation via `/api/revalidate` |
| Cron Jobs | Hourly via `vercel.json` |
| Analytics | Vercel Analytics compatible |
| Standalone output | Skipped on Vercel (uses serverless) |

---

### Deploy with Docker (VPS)

The project includes a production-ready multi-stage Dockerfile:

#### Dockerfile Overview

```
Stage 1: deps     → node:22-alpine, npm ci, prisma generate
Stage 2: builder  → Copy deps, next build (standalone output ~150 MB)
Stage 3: runner   → node:22-alpine, non-root user (nextjs:nodejs),
                     copies standalone + static + public + prisma,
                     HEALTHCHECK on /api/health,
                     runs: prisma migrate deploy && node server.js
```

#### Quick Deploy

```bash
# Build the image
docker build -t myblog .

# Run with environment variables
docker run -d \
  --name myblog \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/myblog" \
  -e AUTH_SECRET="your-secret-at-least-32-characters-long" \
  -e NODE_ENV=production \
  myblog
```

#### docker-compose (Development)

The included `docker-compose.yml` provides PostgreSQL 16 + Redis 7:

```bash
# Start database services only (recommended for local dev)
docker compose up -d postgres redis

# Then run the app natively
npm run dev

# OR start everything including the app (production-like)
docker compose --profile full up --build
```

### Production docker-compose

For production VPS deployment, create a `docker-compose.prod.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: myblog
      POSTGRES_USER: myblog
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myblog"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: "postgresql://myblog:${DB_PASSWORD}@postgres:5432/myblog"
      AUTH_SECRET: "${AUTH_SECRET}"
      NEXT_PUBLIC_SITE_URL: "https://${DOMAIN}"
      CRON_SECRET: "${CRON_SECRET}"
      NODE_ENV: production
    volumes:
      - uploads:/app/public/uploads

  caddy:
    image: caddy:2-alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
  uploads:
  caddy_data:
  caddy_config:
```

**Caddyfile** (automatic HTTPS):

```
yourdomain.com {
    reverse_proxy app:3000
    encode gzip zstd
}
```

**Cron replacement** (systemd timer or crontab):

```bash
# Add to crontab on the VPS
0 * * * * curl -s -H "x-cron-secret: YOUR_CRON_SECRET" http://localhost:3000/api/cron
```

### Self-Hosted PaaS (Coolify / CapRover)

#### Coolify (Recommended)

[Coolify](https://coolify.io/) is a free, open-source, self-hosted Heroku/Vercel alternative:

1. Install Coolify on your VPS:
   ```bash
   curl -fsSL https://cdn.coolify.io/install.sh | bash
   ```
2. Add your repository in the Coolify dashboard
3. Set build pack to **Dockerfile**
4. Add environment variables in the UI
5. Coolify handles: SSL, domains, deployments, health checks, logs

#### CapRover

[CapRover](https://caprover.com/) is another self-hosted PaaS:

1. Install CapRover: `docker run -p 80:80 -p 443:443 caprover/caprover`
2. Create a new app in the dashboard
3. Deploy via Dockerfile (auto-detected)
4. Add environment variables and enable HTTPS

### VPS Provider Recommendations

| Provider | Minimum Plan | Price | Notes |
| --- | --- | --- | --- |
| [Hetzner](https://hetzner.com) | CX22 (2 vCPU, 4 GB) | **€4.49/mo** (~$5) | Best value, EU/US datacenters |
| [DigitalOcean](https://digitalocean.com) | Basic Droplet (1 vCPU, 2 GB) | **$6/mo** | Good docs, marketplace |
| [Oracle Cloud](https://cloud.oracle.com) | Ampere A1 (4 vCPU, 24 GB) | **Free forever** | ARM-based, generous free tier |
| [Vultr](https://vultr.com) | Cloud Compute (1 vCPU, 1 GB) | **$5/mo** | Global locations |
| [Linode/Akamai](https://linode.com) | Nanode (1 vCPU, 1 GB) | **$5/mo** | Simple pricing |
| [Railway](https://railway.app) | Pro | **$5/mo + usage** | PaaS with Dockerfile support |
| [Render](https://render.com) | Starter | **$7/mo** | Auto-deploy from GitHub |
| [Fly.io](https://fly.io) | Machines (1 vCPU, 256 MB) | **$1.94/mo** | Edge deployment, global |

> **Recommended for beginners:** Hetzner CX22 + Coolify = $5/month all-in with automatic SSL, deployments, and health monitoring.

---

## Prisma Schema (48 Models)

The database schema is defined in `prisma/schema.prisma` (1847 lines):

### Enums (16)

`UserRole`, `PostStatus`, `SeriesStatus`, `SeoSuggestionCategory`, `SeoSuggestionSource`, `SeoSuggestionStatus`, `SeoTargetType`, `SeoKeywordIntent`, `SeoEntityType`, `SeoEntityRelation`, `BatchOperationStatus`, `JobStatus`

### Models by Module

| # | Model | Module | Purpose |
| --- | --- | --- | --- |
| 1 | `User` | Auth | Users with 6-role hierarchy, 10 social links, contact fields, custom capabilities |
| 2 | `UserSession` | Auth | Refresh token hash, user agent, IP, expiry, revocation |
| 3 | `EmailVerificationToken` | Auth | Token hash, code hash, expiry |
| 4 | `EmailChangeRequest` | Auth | Old→new email, dual-code verification, admin approval |
| 5 | `UserSettings` | Auth | Registration, login, password policy, session config, bcrypt rounds |
| 6 | `Post` | Blog | Full post with SEO, OG, engagement, scheduling, locking, localization |
| 7 | `Category` | Blog | Hierarchical categories with color, icon, image, sortOrder |
| 8 | `Series` | Blog | Post series with status lifecycle |
| 9 | `PostRevision` | Blog | Title + content snapshots, revision number, change notes |
| 10 | `PostQuote` | Blog | Pull quotes with attribution and source |
| 11 | `Comment` | Comments | Threaded, guest support, spam score, voting, flagging, edit tracking |
| 12 | `CommentVote` | Comments | Upvote/downvote keyed by visitorId |
| 13 | `LearningSignal` | Comments | ML learning signals (action + metadata) |
| 14 | `CommentSettings` | Comments | Content limits, moderation, spam, voting, threading, profanity |
| 15 | `Tag` | Tags | Hierarchical tags with synonyms, linked tags, SEO, following |
| 16 | `TagFollow` | Tags | User tag following with weight |
| 17 | `TagSettings` | Tags | Case sensitivity, autocomplete, max tags, tree mode, auto-tagging |
| 18 | `CaptchaSettings` | Captcha | 5 providers, per-form toggles, fallback chain, lockout |
| 19 | `CaptchaAttempt` | Captcha | IP, provider, success, score |
| 20 | `CaptchaChallenge` | Captcha | In-house challenge with answer, expiry, attempts |
| 21 | `SeoSuggestion` | SEO | Target, category, severity, source, proposed changes, autoApply |
| 22 | `SeoKeyword` | SEO | Term, intent, volume, competition, CPC |
| 23 | `SeoEntity` | SEO | Named entities (6 types) |
| 24 | `SeoEntityEdge` | SEO | Entity graph edges (5 relation types, weighted) |
| 25 | `SeoKeywordHistory` | SEO | Keyword volume trends over time |
| 26 | `BatchOperation` | SEO | Bulk SEO operations with status tracking |
| 27 | `SeoRedirect` | SEO | 301/302 redirects with hit counting |
| 28 | `Page` | Pages | CMS pages with hierarchy, templates, custom code, locking |
| 29 | `PageRevision` | Pages | Page content revision history |
| 30 | `PageSettings` | Pages | Per-page display and behavior config |
| 31 | `SiteSettings` | Settings | ~200 fields across 20+ categories |
| 32 | `Job` | Jobs | Background job with type, step, status, payload, result |
| 33 | `CronLog` | Cron | Run history with status, timing, errors |
| 34 | `CronLock` | Cron | Distributed lock for concurrent safety |
| 35 | `Media` | Media | Files with metadata, variants, content hash, optimization flag |
| 36 | `MediaFolder` | Media | Materialized path folder hierarchy |
| 37 | `MediaSetting` | Media | Upload and optimization settings |
| 38 | `AdProvider` | Ads | Ad network providers with kill switch |
| 39 | `AdSlot` | Ads | Slot positions with targeting rules |
| 40 | `AdPlacement` | Ads | Provider↔slot mapping with scheduling and analytics |
| 41 | `AdLog` | Ads | Impression/click event log |
| 42 | `AdSettings` | Ads | Global ad behavior configuration |
| 43 | `InternalLink` | SEO | Source→target links with anchor text and relevance score |
| 44 | `InterlinkExclusion` | SEO | Exclusion rules for interlinking |
| 45 | `DistributionRecord` | Distribution | Per-post per-channel distribution with status and retries |
| 46 | `DistributionChannel` | Distribution | Social platform channels with credentials |
| 47 | `NewsletterSubscriber` | Newsletter | Subscribers with double opt-in, confirm/unsubscribe tokens |
| 48 | `ConsentLog` | GDPR | Consent audit trail |

---

## UI Component Library

### Reusable UI Primitives (13)

| Component | Purpose |
| --- | --- |
| `AdminPagination` | Paginated data with page size and navigation |
| `Breadcrumbs` | Breadcrumb navigation trail |
| `Button` | Styled button with variants, loading state, icon support |
| `Card` | Content card container |
| `DataTable` | Sortable, filterable data table |
| `FormFields` | `Input`, `Textarea`, `Select`, `Checkbox` with label/error support |
| `Modal` | Dialog modal with size variants + `ConfirmDialog` |
| `PasswordStrengthIndicator` | Visual password strength meter |
| `RoleBadge` | Colored role badge (SUBSCRIBER → SUPER_ADMIN) |
| `RolePicker` | Role selection dropdown |
| `ThemeToggle` | Dark/light mode toggle button |
| `Toast` | Toast notification system (success, error, warning, info) |

### Layout Components (7)

| Component | Purpose |
| --- | --- |
| `AnalyticsScripts` | Consent-aware analytics script injection |
| `CookieConsentBanner` | GDPR cookie consent UI |
| `Footer` | Site footer with social links and contact info |
| `Header` | Site header with navigation, search, theme toggle |
| `Providers` | React context providers (theme, session, CSRF) |
| `PublicShell` | Public page layout wrapper (header + footer + sidebar) |
| `TopBar` | Configurable top bar with contact info, social, CTA |

### Blog Components (7)

| Component | Purpose |
| --- | --- |
| `BlogSidebar` | Sidebar widgets (search, recent posts, categories, tags) |
| `PostCardShareOverlay` | Social share overlay on post cards |
| `PostImageFallback` | Gradient fallback when no featured image |
| `PostNavigation` | Previous/next post navigation |
| `RelatedPosts` | Related posts section |
| `SocialShare` | Social sharing buttons |
| `TableOfContents` | Auto-generated heading-based table of contents |

### Shared Utilities (5)

| Utility | Purpose |
| --- | --- |
| `api-response.types.ts` | Standardized API response type definitions |
| `handle-api-response.ts` | `handleApiResponse()` utility for consistent fetch error handling |
| `prisma-delegate.types.ts` | `PrismaDelegate<T>` generic type for type-safe model delegates |
| `sanitize.util.ts` | HTML sanitization with sanitize-html |
| `text.util.ts` | Text utilities (truncate, slug generation, reading time) |

---

## Next.js Configuration

Key settings in `next.config.ts`:

| Setting | Value | Purpose |
| --- | --- | --- |
| `output` | `"standalone"` (Linux only) | Self-contained Node.js server (~150 MB) for Docker |
| `poweredByHeader` | `false` | Hide `X-Powered-By: Next.js` header |
| `reactCompiler` | `true` | Enable React Compiler for auto-memoization |
| `images.formats` | `["image/avif", "image/webp"]` | Modern image formats |
| `images.remotePatterns` | `https://**` | Allow all HTTPS image sources |
| `serverExternalPackages` | `["bcrypt", "sharp"]` | Bundle exclude for native modules |

### Security Headers (7)

Applied to all routes via `next.config.ts`:

| Header | Value |
| --- | --- |
| `X-DNS-Prefetch-Control` | `on` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

> **CSP** is handled dynamically by `proxy.ts` with a per-request nonce (not in static headers).

### Dynamic Redirects

SEO redirects are loaded from the `SeoRedirect` database table at build time:

```typescript
async redirects() {
  const rows = await prisma.seoRedirect.findMany({ where: { isActive: true } });
  return rows.map(r => ({
    source: r.fromPath,
    destination: r.toPath,
    permanent: r.statusCode === 301,
  }));
}
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Ensure type safety: `npm run typecheck` (zero errors expected)
4. Ensure lint passes: `npm run lint`
5. Run tests:
   ```bash
   npm test              # Component tests (163)
   npm run test:server   # Server tests (697)
   npm run e2e           # E2E tests (4 browsers)
   ```
6. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
7. Push and open a pull request

### Code Quality Standards

| Check | Threshold |
| --- | --- |
| TypeScript | Zero errors (`tsc --noEmit`) |
| ESLint | Zero warnings/errors |
| Vitest coverage | 85% lines/statements, 80% branches/functions |
| Jest coverage | 85% lines/statements, 80% branches/functions |
| Build | Must complete with zero errors |

---

## License

This project is **private** and not licensed for public use or redistribution.

---

<p align="center">
  Built with ❤️ using <strong>Next.js 16</strong>, <strong>React 19</strong>, <strong>Prisma 7</strong>, and <strong>PostgreSQL 16</strong>
</p>
