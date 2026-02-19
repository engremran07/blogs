# MyBlog — Full-Stack Blog & CMS Platform

A production-ready, feature-rich blog platform and content management system built with **Next.js 16**, **React 19**, **Prisma 7**, and **PostgreSQL**. Includes a complete admin dashboard, rich text editor, SEO engine, ad management, social distribution, media library, CAPTCHA system, cookie consent (GDPR), analytics injection, and more — deployable on **Vercel** or any **Docker / VPS** host.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.4.0-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Node](https://img.shields.io/badge/Node.js-22-339933?logo=node.js)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-Private-red)

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Admin Panel](#admin-panel)
- [Public Pages](#public-pages)
- [API Reference](#api-reference)
- [Rich Text Editor](#rich-text-editor)
- [CAPTCHA System](#captcha-system)
- [SEO Engine](#seo-engine)
- [Media Management](#media-management)
- [Advertising Module](#advertising-module)
- [Social Distribution](#social-distribution)
- [Cookie Consent & GDPR](#cookie-consent--gdpr)
- [Analytics Integration](#analytics-integration)
- [Settings & Theming](#settings--theming)
- [Menu Builder](#menu-builder)
- [Cron & Automation](#cron--automation)
- [Authentication & Security](#authentication--security)
- [Middleware & Rate Limiting](#middleware--rate-limiting)
- [Health Check](#health-check)
- [Deployment](#deployment)
- [UI Component Library](#ui-component-library)
- [Contributing](#contributing)
- [License](#license)

---

## Features Overview

| Category | Highlights |
| --- | --- |
| **Content Management** | Posts, pages, categories, tags, series, revisions, guest posts, scheduled publishing, soft delete |
| **Admin Dashboard** | 13-section admin panel with role-based access, module kill switches, responsive sidebar |
| **Rich Text Editor** | Custom contentEditable WYSIWYG with 22 toggleable features, markdown shortcuts, drag-and-drop images, tables, code blocks, auto-save |
| **SEO Engine** | Per-content scoring (0–100), 8 audit categories, JSON-LD structured data, dynamic OG image generation (Edge runtime), auto-sitemap, robots.txt, keyword tracking |
| **Media Library** | Grid/list views, folder tree, drag-and-drop/paste/URL upload, image optimization (WebP/AVIF), bulk operations, deduplication |
| **Comments** | Threaded comments, moderation queue, spam detection, upvoting, guest comments, per-post settings |
| **CAPTCHA** | 5 providers (Turnstile, reCAPTCHA v3, reCAPTCHA v2, hCaptcha, in-house) with automatic fallback chain |
| **Advertising** | Provider/slot/placement management, 11 ad networks, 30+ positions, 14 formats, 10+ specialized components (sticky, interstitial, floating, exit-intent, vignette, video, in-article, in-feed, native), global/overlay ad slots, AdSettings panel (25+ fields), consent-gated rendering, global kill switch |
| **Distribution** | 12 social platforms, auto-publish, circuit breaker, rate limiting, health monitoring |
| **Cookie Consent** | GDPR-compliant cookie banner, per-category consent (essential/analytics/marketing), localStorage persistence |
| **Analytics** | Consent-aware GA4 injection, conditional script loading, `anonymize_ip` |
| **Authentication** | NextAuth v5, JWT sessions, bcrypt hashing, role-based authorization (6 roles), CAPTCHA-protected login |
| **Theming** | Dark mode, color customization, font selection, custom CSS injection, top bar configuration |
| **Automation** | 18 cron tasks, scheduled publishing, media cleanup, session purge, spam removal |
| **Menus** | Visual menu builder for header/footer/top bar, drag-and-drop reordering, nested items |
| **Settings** | 110+ configurable fields across 10 settings tabs, per-module kill switches |
| **SEO Redirects** | 301/302 redirect management with hit counting, loaded into Next.js at build time |
| **RSS** | Configurable RSS feed with customizable title |
| **Middleware** | API rate limiting (30 mutations/60s), CRON secret gate |
| **Health Check** | `/api/health` endpoint for Docker HEALTHCHECK, load balancers, uptime monitors |
| **Deployment** | Vercel-ready (`vercel.json`), Docker-ready (multi-stage `Dockerfile` + `docker-compose.yml`) |

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [Next.js 16.1.6](https://nextjs.org/) — App Router, Turbopack, React Compiler, standalone output |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) — strict mode |
| **UI** | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Headless UI](https://headlessui.com/), [Lucide Icons](https://lucide.dev/) |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) via [Prisma ORM 7.4](https://www.prisma.io/) with `@prisma/adapter-pg` driver adapter |
| **Auth** | [NextAuth v5](https://authjs.dev/) (Auth.js) — Credentials provider, JWT strategy, PrismaAdapter |
| **Caching** | [Upstash Redis](https://upstash.com/) with in-memory no-op fallback for local dev |
| **Rate Limiting** | [@upstash/ratelimit](https://github.com/upstash/ratelimit) — sliding window, 30 req/60s per IP |
| **Editor** | Custom contentEditable WYSIWYG — 22 toggleable features, zero external editor deps |
| **Validation** | [Zod 4](https://zod.dev/) — schema validation on every API route |
| **Security** | bcrypt 6, sanitize-html, HSTS/CSP/X-Frame headers, server-only imports |
| **AI** | [OpenAI SDK](https://platform.openai.com/) — SEO suggestions, content assistance (optional) |
| **Deployment** | [Vercel](https://vercel.com/) (serverless, cron) or Docker / VPS (standalone Node.js) |

### Key Dependencies

```text
next 16.1.6          react 19.2.3         prisma 7.4.0
next-auth 5-beta.30  @upstash/redis       @upstash/ratelimit
zod 4.3              tailwindcss 4        sanitize-html 2.17
bcrypt 6             sanitize-html 2.17   lucide-react 0.564
openai 6.21          pg 8.18              tsx 4.21
```

---

## Architecture

### High-Level Structure

```text
MyBlog/
├── .vscode/                # VS Code settings & recommended extensions
├── prisma/                 # Database schema, migrations, seed
│   ├── schema.prisma       # 45 models, 12 enums (~1,430 lines)
│   ├── seed.ts             # Demo data seeder
│   └── migrations/         # Prisma migration history
├── public/uploads/         # Local media storage (writable)
├── src/
│   ├── middleware.ts        # API rate limiting + CRON gate
│   ├── app/                # Next.js App Router (pages + API)
│   │   ├── (public pages)  # Home, blog, about, contact, search, tags, auth
│   │   ├── admin/          # Admin dashboard (13 sections)
│   │   └── api/            # REST API endpoints (67 route files)
│   ├── components/
│   │   ├── blog/           # Blog-specific (TOC, sidebar, social share, related)
│   │   ├── layout/         # Shell components (header, footer, providers, cookie banner, analytics)
│   │   └── ui/             # Reusable UI library (button, card, modal, toast, table, forms)
│   ├── features/           # Domain modules (12 feature modules)
│   │   ├── ads/            # Advertising — 10+ specialized components (AdRenderer, GlobalAdSlots, GlobalOverlayAds, StickyAd, InterstitialAd, FloatingAd, ExitIntentAd, VignetteAd, VideoAd, InArticleAd, InFeedAdCard, NativeRecommendationAd), AdSettings panel, consent integration
│   │   ├── auth/           # Authentication & user services
│   │   ├── blog/           # Blog listing & rendering
│   │   ├── captcha/        # Multi-provider CAPTCHA system
│   │   ├── comments/       # Comment system & moderation
│   │   ├── distribution/   # Social media distribution
│   │   ├── editor/         # Rich text WYSIWYG editor
│   │   ├── media/          # Media library & processing
│   │   ├── pages/          # Static page management
│   │   ├── seo/            # SEO audit engine & tools
│   │   ├── settings/       # Site settings, theme, menu builder
│   │   └── tags/           # Tag management & deduplication
│   ├── server/
│   │   ├── auth.ts         # NextAuth v5 configuration
│   │   ├── cache/redis.ts  # Singleton Redis client (Upstash or no-op fallback)
│   │   ├── db/prisma.ts    # Singleton Prisma client
│   │   ├── env/            # Zod-validated environment variables (27+ vars)
│   │   ├── observability/  # Structured JSON logging
│   │   └── wiring/         # Dependency Injection container (~310 lines)
│   └── types/              # Shared TypeScript types
├── Dockerfile              # Multi-stage production image (node:22-alpine)
├── docker-compose.yml      # PostgreSQL 16 + Redis 7 + App
├── vercel.json             # Cron schedule + function durations
├── next.config.ts          # Standalone output, CSP, security headers, React Compiler
├── prisma.config.ts        # Migration & seed configuration
├── .env.example            # Documented env var template
├── .nvmrc                  # Node.js 22
└── package.json            # npm scripts & dependencies
```

**Codebase**: **277 source files**, **67 API routes**, **45 Prisma models**, **12 enums**

### Feature Module Pattern

Every feature module follows a consistent structure:

```text
features/<module>/
├── index.ts                # Public barrel exports (types + services + UI)
├── types.ts                # TypeScript types, interfaces, enums
├── server/                 # Server-only code (marked with "server-only")
│   ├── <module>.service.ts # Business logic
│   ├── schemas.ts          # Zod validation schemas
│   ├── constants.ts        # Defaults and config
│   └── ...                 # Additional services, utils
├── ui/                     # React components
│   └── <Component>.tsx
└── utils/                  # Shared utilities (optional)
```

### Dependency Injection

All services are instantiated once in `src/server/wiring/index.ts` (~310 lines) and imported as singletons:

```typescript
import { blogService, commentService, tagService } from "@/server/wiring";
```

This ensures single Prisma client, single Redis client, consistent event bus wiring, and testability.

---

## Getting Started

### Prerequisites

| Requirement | Version |
| --- | --- |
| **Node.js** | 22+ (pinned in `.nvmrc`) |
| **PostgreSQL** | 16+ |
| **npm** | 10+ |
| **VS Code** | Recommended — workspace settings and extension recommendations included |

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/myblog.git
cd myblog

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local — at minimum set DATABASE_URL and AUTH_SECRET

# Push database schema (development)
npx prisma db push

# Seed with demo data (optional — creates users, posts, pages, categories, tags,
# 12 ad slots, default ad provider, 7 sample placements, cookie consent & GDPR enabled)
npx prisma db seed

# Start development server (Turbopack)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Seed Users

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@myblog.com` | `Admin123!@#` |
| Editor | `editor@myblog.com` | `Editor123!@#` |
| Author | `author@myblog.com` | `Author123!@#` |

---

## Environment Variables

Create a `.env.local` file in the project root. Only `DATABASE_URL` and `AUTH_SECRET` are required — everything else has sensible defaults or can be configured via the admin panel.

```env
# ═══════════════════════════════════════════════════════════════
# DATABASE (required)
# ═══════════════════════════════════════════════════════════════
DATABASE_URL="postgresql://user:pass@localhost:5432/myblog"
DATABASE_URL_UNPOOLED="postgresql://user:pass@localhost:5432/myblog"

# ═══════════════════════════════════════════════════════════════
# AUTH (required in production)
# ═══════════════════════════════════════════════════════════════
# Generate: openssl rand -base64 32
AUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# ═══════════════════════════════════════════════════════════════
# CACHE — Upstash Redis (optional)
# Falls back to in-memory no-op if not set
# ═══════════════════════════════════════════════════════════════
# UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-token"

# ═══════════════════════════════════════════════════════════════
# VPS / Docker (required for non-Vercel rolling deploys)
# Prevents Server Action version-skew
# Generate: openssl rand -hex 32
# ═══════════════════════════════════════════════════════════════
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=""

# ═══════════════════════════════════════════════════════════════
# AI (optional)
# ═══════════════════════════════════════════════════════════════
# OPENAI_API_KEY=""

# ═══════════════════════════════════════════════════════════════
# CRON (recommended)
# Verified by middleware on /api/cron
# Generate: openssl rand -base64 32
# ═══════════════════════════════════════════════════════════════
# CRON_SECRET=""

# ═══════════════════════════════════════════════════════════════
# CAPTCHA (optional — supports multiple providers)
# ═══════════════════════════════════════════════════════════════
# CLOUDFLARE_TURNSTILE_SECRET=""
# NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
# NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY=""
# NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=""
# NEXT_PUBLIC_HCAPTCHA_SITE_KEY=""

# ═══════════════════════════════════════════════════════════════
# PUBLIC SITE URL (optional — for OG images, sitemap, etc.)
# ═══════════════════════════════════════════════════════════════
# NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# ═══════════════════════════════════════════════════════════════
# MEDIA / S3 STORAGE (optional — falls back to public/uploads/)
# ═══════════════════════════════════════════════════════════════
# S3_BUCKET=""
# S3_REGION=""
# S3_ACCESS_KEY_ID=""
# S3_SECRET_ACCESS_KEY=""
# S3_ENDPOINT=""
# S3_PUBLIC_URL=""
```

All environment variables are validated at startup via Zod in `src/server/env/index.ts`. If a required variable is missing, the server fails fast with a clear error message.

---

## Database Setup

### Development

```bash
# Push schema directly (no migration history)
npx prisma db push

# Seed with demo data
npx prisma db seed

# Open Prisma Studio (visual database browser)
npx prisma studio
```

### Production

```bash
# Run migrations
npx prisma migrate deploy

# Or via Docker (handled automatically by Dockerfile CMD)
docker compose --profile full up
```

### Schema Overview (45 Models, 12 Enums)

| Model Group | Models |
| --- | --- |
| **Auth** | `User`, `UserSession`, `EmailVerificationToken`, `EmailChangeRequest` |
| **Content** | `Post`, `Page`, `Category`, `Tag`, `Series`, `PostRevision`, `PostQuote` |
| **Engagement** | `Comment`, `CommentVote`, `CommentSettings`, `LearningSignal` |
| **Media** | `Media`, `MediaVariant`, `MediaFolder`, `MediaTag` |
| **Ads** | `AdProvider`, `AdSlot`, `AdPlacement`, `AdLog` |
| **Distribution** | `DistributionChannel`, `DistributionRecord` |
| **SEO** | `SeoRedirect`, `SeoKeyword`, `SeoKeywordRelation`, `SeoSuggestion`, `SeoKeywordVolume` |
| **Settings** | `SiteSettings`, `CommentSettings`, `PageType` |
| **System** | `CronLog`, `Menu`, `MenuItem` |

| Enum | Values |
| --- | --- |
| `UserRole` | SUBSCRIBER, CONTRIBUTOR, AUTHOR, EDITOR, ADMINISTRATOR, SUPER_ADMIN |
| `PostStatus` | DRAFT, PUBLISHED, SCHEDULED, ARCHIVED |
| `PageStatus` | DRAFT, PUBLISHED, SCHEDULED, ARCHIVED |
| `PageVisibility` | PUBLIC, PRIVATE, PASSWORD_PROTECTED, LOGGED_IN_ONLY |
| `CommentStatus` | PENDING, APPROVED, REJECTED, SPAM, DELETED, FLAGGED |
| `MediaType` | IMAGE, VIDEO, AUDIO, DOCUMENT, ARCHIVE, OTHER |
| `DistributionStatus` | PENDING, SCHEDULED, PUBLISHING, PUBLISHED, FAILED, CANCELLED |
| ... | *(12 total enums)* |

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server with Turbopack (hot reload) |
| `npm run build` | Generate Prisma client + Next.js production build (standalone output) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database (dev) |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database with demo data (`tsx prisma/seed.ts`) |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run Vitest with V8 coverage |
| `npm run test:server` | Run Jest server/API tests |
| `npm run test:server:cov` | Run Jest with coverage |
| `npm run e2e` | Run Playwright E2E tests |
| `npm run e2e:ui` | Open Playwright UI mode |
| `npm run e2e:headed` | Run E2E tests in headed browser |

---

## Project Structure

### Prisma Schema (~1,430 lines)

The schema at `prisma/schema.prisma` defines the entire data model. Key groups:

- **Content models** with full-text search, soft delete (`deletedAt`), slug uniqueness, and audit timestamps
- **Settings** as a single-row config table with 110+ fields across identity, appearance, content, comments, social, SEO, email, security, privacy, and advanced categories
- **Media** with variant generation, folder hierarchy, content-hash deduplication
- **SEO** with per-content audit scoring, keyword volume tracking, suggestion lifecycle

### Admin Panel (13 Sections)

```text
src/app/admin/
├── layout.tsx          # Server-side auth guard (redirects non-admin to /login)
├── AdminShell.tsx      # Client-side UI shell (sidebar, topbar, mobile menu)
├── page.tsx            # Dashboard overview
├── ads/                # Ad provider/slot/placement management + AdSettings panel (25+ fields)
├── categories/         # Category tree with drag-and-drop
├── comments/           # Moderation queue
├── cron/               # Cron task panel + history
├── distribution/       # Social distribution channels
├── media/              # Media library
├── menus/              # Menu builder
├── pages/              # Page management
├── posts/              # Post management + editor
├── seo/                # SEO audit dashboard
├── settings/           # 10-tab settings page (963 lines)
├── tags/               # Tag management
└── users/              # User management
```

### API Routes (67 Files)

```text
src/app/api/
├── ads/                # 10 routes — providers, slots, placements, scan, settings, kill switch
├── og/                 # 1 route — dynamic OG image generation (Edge runtime, 1200×630)
├── auth/               # 2 routes — NextAuth catch-all, registration
├── captcha/            # 2 routes — challenge, verification
├── categories/         # 2 routes — CRUD + per-ID
├── comments/           # 3 routes — CRUD, per-ID, bulk moderation
├── cron/               # 2 routes — trigger + history
├── distribution/       # 10 routes — channels, distribute, health, kill switch, records, stats
├── health/             # 1 route — system health check
├── media/              # 7 routes — CRUD, bulk, cleanup, folders, optimize, stats, upload-url
├── pages/              # 3 routes — CRUD, per-ID, bulk
├── posts/              # 3 routes — CRUD, per-ID, bulk
├── seo/                # 2 routes — audit data + redirects
├── settings/           # 4 routes — CRUD, per-group, module-status, public
├── tags/               # 3 routes — CRUD, per-ID, bulk
├── upload/             # 1 route — file upload
└── users/              # 2 routes — CRUD + bulk
```

---

## Admin Panel

### Access Control

The admin panel at `/admin` requires `ADMINISTRATOR`, `SUPER_ADMIN`, or `EDITOR` role. Authentication is enforced server-side in `src/app/admin/layout.tsx` before any client code loads. The client shell (`AdminShell.tsx`) provides the sidebar, top bar, mobile menu, and profile dropdown.

### Dashboard

- Stats grid: Total Posts, Comments, Users, Views, Media Files
- Recent posts and comments at a glance

### Content Management

| Section | Features |
| --- | --- |
| **Posts** | CRUD, search, status filter, pagination, bulk actions (publish/archive/delete), featured/pinned, guest posting, SEO fields, tag & category assignment |
| **Pages** | CRUD, 7 templates (Default, Full Width, Sidebar Left/Right, Landing, Blank, Custom), 4 visibility modes, parent-child hierarchy, scheduling |
| **Categories** | Hierarchical tree with drag-and-drop reordering, color pickers, icons, images, featured flag |
| **Tags** | CRUD with duplicate detection (similarity threshold), merge capability, synonyms, protected flag, SEO metadata |

### Post Editor

- Rich text WYSIWYG with full toolbar
- Featured image picker (integrated media manager)
- SEO fields (title, description)
- Tag and category multi-select
- Status: Draft, Published, Scheduled, Archived
- Featured/Pinned toggles
- Guest post support (author name, email, bio, avatar, URL)
- Auto-generated slug from title

### Page Editor

- Template selector (7 options)
- Visibility control (Public, Private, Password Protected, Logged-in Only)
- Full SEO panel (meta title, description, OG fields, canonical URL, noIndex, noFollow)
- Parent page hierarchy and sort ordering
- Scheduled publishing

### Moderation & Users

| Section | Features |
| --- | --- |
| **Comments** | Tab-based queue (All/Pending/Approved/Spam/Rejected/Deleted/Flagged), approve/reject/spam actions, bulk operations, spam score display |
| **Users** | 6 roles (Subscriber → Super Admin), full profile editing, social links, bulk role changes, post/comment counts |

### Media Library

- Grid and list views
- Drag-and-drop, paste, and URL upload
- Folder tree sidebar navigation
- Search, type/size/date filters, sorting
- Bulk delete, move, and tag operations
- Image optimization with variant presets (thumb/small/medium/large/OG/full)
- WebP and AVIF conversion
- Content deduplication via hash
- Detail sidebar with per-item SEO audit

### Configuration

| Section | Features |
| --- | --- |
| **Settings** | **10 tabs**, 110+ fields — General, Appearance, Content, Comments, Social, SEO, Email, Security, **Privacy**, Advanced |
| **SEO** | Site-wide audit dashboard, per-content scoring, issue severity tracking, bulk fix page |
| **Ads** | Provider/slot/placement management, 11 networks, global kill switch, compliance panel, **AdSettings panel** (25+ configurable fields: auto-placement, analytics, consent, refresh, lazy loading, viewability) |
| **Distribution** | 12 platforms, channel management, auto-publish, circuit breaker health, kill switch |
| **Menus** | Header/Footer/Top Bar builder, nested items, drag-and-drop reorder |
| **Cron** | 18 automated tasks, manual trigger, execution history with per-task results |

---

## Public Pages

All public pages use **ISR (Incremental Static Regeneration)** for optimal performance and cost:

| Page | Route | ISR | Description |
| --- | --- | --- | --- |
| **Home** | `/` | 15 min | Hero section, featured post, latest posts grid, popular tags cloud |
| **Blog** | `/blog` | 10 min | Configurable layout (grid/list), filters, pagination, sidebar |
| **Post** | `/blog/[slug]` | 1 hr | Full article with TOC, social sharing, related posts, navigation, comments, JSON-LD, dynamic OG image fallback (`/api/og`). Up to 500 slugs pre-rendered at build via `generateStaticParams` |
| **About** | `/about` | 24 hr | Dynamic stats, mission statement |
| **Contact** | `/contact` | — | Contact form with CAPTCHA, info cards |
| **Tags** | `/tags` | 1 hr | Featured tags, trending tags, tag cloud |
| **Tag Detail** | `/tags/[slug]` | 1 hr | Posts filtered by tag. Up to 500 slugs pre-rendered |
| **Search** | `/search` | — | Full-text search with real-time results |
| **Login** | `/login` | — | Email/password auth with CAPTCHA |
| **Register** | `/register` | — | Registration with password strength indicator, CAPTCHA |
| **Profile** | `/profile` | — | Edit profile, change password |

### Blog Components

| Component | Description |
| --- | --- |
| **Table of Contents** | Parses H1–H4, active heading tracking via IntersectionObserver, smooth scroll |
| **Blog Sidebar** | Configurable widgets: search, recent posts, categories, tags, monthly archive |
| **Social Share** | Facebook, Twitter, LinkedIn, WhatsApp, Email, Copy Link |
| **Related Posts** | Server-rendered, 3 posts by shared tags/categories |
| **Post Navigation** | Previous/Next links by publish date |
| **Share Overlay** | Hover overlay on post cards for quick sharing |

---

## API Reference

All API routes are under `/api/`. Admin endpoints require authentication and role-based authorization. All mutation routes are rate-limited (30 requests per 60 seconds per IP).

| Endpoint | Methods | Auth | Description |
| --- | --- | --- | --- |
| `/api/auth/*` | POST | Public | NextAuth authentication, registration |
| `/api/posts` | GET, POST | POST: Author+ | List/create posts |
| `/api/posts/[id]` | GET, PATCH, DELETE | PATCH/DEL: Author+ | Get/update/soft-delete a post |
| `/api/posts/bulk` | POST | Editor+ | Bulk publish, archive, delete |
| `/api/pages` | GET, POST | POST: Editor+ | List/create pages |
| `/api/pages/[id]` | GET, PATCH, DELETE | PATCH: Editor+, DEL: Admin+ | Get/update/delete a page |
| `/api/pages/bulk` | POST | Editor+ | Bulk page operations |
| `/api/categories` | GET, POST | POST: Editor+ | List/create categories |
| `/api/categories/[id]` | GET, PATCH, DELETE | PATCH/DEL: Editor+ | Category CRUD |
| `/api/tags` | GET, POST | POST: Editor+ | List (paginated) / create tags |
| `/api/tags/[id]` | GET, PATCH, DELETE | PATCH/DEL: Editor+ | Tag CRUD |
| `/api/tags/bulk` | POST | Editor+ | Bulk tag operations |
| `/api/comments` | GET, POST | Admin GET (all) | List/create comments |
| `/api/comments/[id]` | PATCH, DELETE | Auth required | Moderate/delete comments |
| `/api/comments/bulk` | POST | Editor+ | Bulk moderation |
| `/api/users` | GET, POST, PATCH | Admin+ | User management |
| `/api/og` | GET | Public | Dynamic OG image generation (Edge runtime, 1200×630, title/description/author overlay) |
| `/api/users/bulk` | POST | Admin+ | Bulk user operations |
| `/api/media` | GET, POST, PATCH, DELETE | Auth required | Media CRUD |
| `/api/media/[id]` | GET, PATCH, DELETE | Auth required | Individual media operations |
| `/api/media/bulk` | POST | Auth required | Bulk media operations |
| `/api/media/cleanup` | POST | Admin+ | Orphan media cleanup |
| `/api/media/folders` | GET, POST | Auth required | Folder management |
| `/api/media/optimize` | POST | Auth required | Image optimization |
| `/api/media/stats` | GET | Auth required | Media library statistics |
| `/api/upload` | POST | Auth required | File upload |
| `/api/settings` | GET, PATCH | PATCH: Admin+ | Site settings |
| `/api/settings/[group]` | GET, PATCH | PATCH: Admin+ | Settings by group (social, privacy, etc.) |
| `/api/settings/module-status` | GET | Public | Module enable/disable status |
| `/api/settings/public` | GET | Public | Public layout settings (theme, cookie consent, analytics) |
| `/api/seo` | GET | Editor+ | SEO audit data |
| `/api/seo/redirects` | GET, POST, DELETE | Editor+ | SEO redirect management |
| `/api/ads/*` | Various | Auth required | Ad provider/slot/placement management (10 routes) |
| `/api/distribution/*` | Various | Auth required | Distribution channel management (10 routes) |
| `/api/captcha/challenge` | POST | Public | Generate CAPTCHA challenge |
| `/api/captcha/verify` | POST | Public | Verify CAPTCHA response |
| `/api/cron` | POST | Bearer token | Trigger cron tasks (secret-gated) |
| `/api/cron/history` | GET | Admin+ | Cron execution history |
| `/api/health` | GET | Public | System health check (DB + Redis) |

---

## Rich Text Editor

A custom-built contentEditable WYSIWYG editor with **22 admin-toggleable features**:

### Formatting

- **Text**: Bold, italic, underline, strikethrough
- **Headings**: H1, H2, H3 (configurable allowed levels)
- **Lists**: Bullet, numbered, task/check lists
- **Blocks**: Blockquotes, code blocks, inline code, horizontal rules

### Media & Links

- **Images**: Drag-and-drop upload, button upload, configurable size limits and allowed types
- **Videos**: YouTube, Vimeo, Dailymotion, Twitch, Loom embeds (configurable providers)
- **Links**: Insert/edit with URL and display text
- **Tables**: Insert with configurable row/column limits

### Styling

- **Text color** and **background color** with palette picker
- **Text alignment**: Left, center, right, justify

### Productivity

- **Fullscreen** editing mode
- **Undo/redo** with configurable history size
- **Markdown shortcuts**: `# heading`, `- list`, `> quote`, `---`, `` ``` code ```
- **Auto-save** to localStorage with configurable debounce
- **Word/character count** and reading time display

### Safety & Accessibility

- XSS-safe paste sanitization (allowlist-based)
- Error boundaries for graceful failure
- ARIA roles and keyboard shortcuts
- Content limits (max words, max characters) configurable by admin

---

## CAPTCHA System

Multi-provider CAPTCHA with automatic fallback chain:

```text
Turnstile → reCAPTCHA v3 → reCAPTCHA v2 → hCaptcha → In-house
```

| Provider | Type | Dependency |
| --- | --- | --- |
| **Cloudflare Turnstile** | Privacy-first, invisible | External |
| **Google reCAPTCHA v3** | Score-based, invisible | External |
| **Google reCAPTCHA v2** | Checkbox challenge | External |
| **hCaptcha** | Privacy-focused | External |
| **In-house** | Custom challenge | Zero external dependency |

### Features

- **Automatic fallback chain** — if a provider fails to load, the next one activates
- **Admin-configurable** fallback order override
- **Per-provider enable/disable** toggles
- **Per-form requirements** — configure which forms require CAPTCHA (login, register, comment, contact)
- **Global kill switch** — auto-verifies with sentinel token when disabled
- **Theme support** — light, dark, auto
- **Error boundary** wrapping for resilience
- **Direct server-side verification** — auth flow calls `CaptchaVerificationService` directly (no self-fetch)

---

## SEO Engine

### Audit System

- Per-content scoring (0–100) across **8 categories**:
  - Meta, Content, Technical, Image, Linking, Structured Data, Social, Performance
- 4 issue severity tiers: **Critical**, **Important**, **Optional**, **Info**
- Site-wide aggregation with score distribution (excellent/good/needs work/poor)
- Worst-performing content list with actionable recommendations
- Bulk fix page for rapid corrections

### Structured Data (JSON-LD)

- **`WebSite`** JSON-LD with `SearchAction` on root layout — **dynamic** (reads `siteName` and `siteDescription` from database)
- **`Article`** + **`BreadcrumbList`** JSON-LD on every blog post
- Support for **16 Schema.org types**: Article, BlogPosting, NewsArticle, Event, WebSite, WebPage, BreadcrumbList, FAQPage, HowTo, Organization, Person, Product, LocalBusiness, VideoObject, ImageObject, SearchAction

### Auto-Generated Files

- **`sitemap.xml`** — Posts, pages, categories, tags, static routes (respects `noIndex`)
- **`robots.txt`** — Blocks AI scrapers (GPTBot, ChatGPT-User, CCBot, anthropic-ai, ClaudeBot), disallows admin/API paths

### Dynamic Metadata

- `generateMetadata()` on root layout reads `siteName`, `siteDescription` from database
- Per-post/page: meta title, description, OpenGraph, Twitter Cards, canonical URLs
- ISR ensures metadata stays fresh without rebuilding

### Dynamic OG Image Generation

- **Edge runtime** API route (`/api/og`) generates 1200×630 Open Graph images on-the-fly
- Accepts `title`, `description`, `author` query params for per-content customization
- Used as automatic fallback when a post has no featured image
- Branded overlay with gradient background, site title, and author attribution

### Additional

- SEO redirect management (301/302) with hit counting — loaded into `next.config.ts` at build time
- Keyword tracking with volume history and trend analysis
- Search verification codes (Google, Bing, Yandex, Pinterest, Baidu)
- Content-Security-Policy header with properly scoped directives for all CAPTCHA/analytics providers

---

## Media Management

### Upload Methods

- Drag-and-drop files onto the library
- File picker dialog
- Paste from clipboard
- Import from URL

### Processing

- Automatic image optimization
- Variant generation: thumb, small, medium, large, OG, full
- WebP and AVIF conversion
- Content deduplication via SHA hash

### Organization

- Hierarchical folder system with tree navigation
- Tags per media item
- Search and filter by type, tags, size, date
- Grid and list view modes

### Operations

- Bulk delete, move between folders, tag management
- Per-item metadata: alt text, title, description, tags
- Per-item SEO audit
- Soft delete with configurable retention

### Storage

- **Local filesystem** (default) — `public/uploads/`
- **S3-compatible storage** — configurable via env vars (any S3-compatible backend)

---

## Advertising Module

Manage ads from **11 supported networks**:

> AdSense · Google Ad Manager · Media.net · Amazon APS · Ezoic · Raptive · Monumetric · PropellerAds · Sovrn · Outbrain · Custom

### Management

- **Providers**: Name, type, credentials, priority, load strategy, kill switch
- **Slots**: 30+ positions (including IN_ARTICLE, STICKY_BOTTOM, INTERSTITIAL, EXIT_INTENT, FLOATING), 14 formats, page type targeting, responsive flags, render priority, max dimensions
- **Placements**: Provider → Slot binding with start/end date scheduling, full CRUD modal in admin
- **Overview**: Stats dashboard with impressions, clicks, CTR, revenue by provider and position
- **Compliance**: Compliance scan panel
- **Ad coverage**: `AdContainer` rendered on blog, about, tags, search, contact pages with wildcard matching
- **AdSettings panel**: 25+ configurable fields — auto-placement, analytics, consent, ad refresh interval, lazy loading, viewability threshold, global density cap, max ads per page

### Specialized Ad Components (10+)

| Component | Description |
| --- | --- |
| **AdRenderer** | Core rendering engine — consent-gated, impression/click tracking, lazy loading, viewability detection |
| **GlobalAdSlots** | Injects header, sidebar, footer, and sticky ad slots across all public pages |
| **GlobalOverlayAds** | Renders interstitial, exit-intent, floating, and vignette overlay ads site-wide |
| **StickyAd** | Fixed-position ad that follows scroll with close button |
| **InterstitialAd** | Full-screen overlay ad triggered by navigation/time delay |
| **FloatingAd** | Corner-anchored floating ad with drag support |
| **ExitIntentAd** | Triggered when cursor moves toward browser close (desktop) or back button (mobile) |
| **VignetteAd** | Between-page full-screen ad with smooth transitions |
| **VideoAd** | VAST/VPAID-compatible video ad with play/pause/mute controls |
| **InArticleAd** | Auto-injected between paragraphs of blog post content |
| **InFeedAdCard** | Inserted every 4th post in blog listing grids |
| **NativeRecommendationAd** | Native ad styled as a recommended content card |

### Controls

- Global kill switch to disable all ads instantly
- Per-provider enable/disable
- Module-level kill switch in settings
- Cookie consent integration — `requireConsent` flag flows from AdSettings → AdContainer/GlobalAdSlots → AdRenderer/GlobalOverlayAds → `useCookieConsent()` hook; marketing ads blocked until visitor grants consent (GDPR mode), with a consent-needed placeholder shown in place of the ad

---

## Social Distribution

Distribute content across **12 platforms**:

> Twitter · Facebook · LinkedIn · Telegram · WhatsApp · Pinterest · Reddit · Instagram · TikTok · Medium · YouTube · Custom

### Features

- Channel management with credentials and platform-specific rules
- Auto-publish on post publication
- Distribution records with status tracking (Pending → Scheduled → Publishing → Published/Failed)
- Platform health monitoring with circuit breaker pattern
- Rate limiting per platform
- Success rate metrics
- Global kill switch
- Retry failed distributions

---

## Cookie Consent & GDPR

A fully-featured, GDPR-compliant cookie consent system that is admin-configurable and respects user choices across the site.

### How It Works

1. Admin enables cookie consent in **Settings → Privacy** tab
2. A banner slides up on every public page for first-time visitors
3. User makes a choice → consent is stored in `localStorage` with version tracking

### Two Modes

| Mode | Behavior |
| --- | --- |
| **Simple** (GDPR off) | Informational banner with a **"Got it!"** button. All scripts load immediately. |
| **GDPR** (GDPR on) | Full consent management: **Accept All**, **Reject All**, **Manage Preferences**. Analytics and marketing scripts are blocked until the visitor explicitly opts in. |

### Cookie Categories (GDPR Mode)

| Category | Description | Toggleable |
| --- | --- | --- |
| **Essential** | Auth, CSRF, session — always on | No (locked) |
| **Analytics** | GA4, site usage tracking | Yes |
| **Marketing** | Ad scripts, pixel tracking | Yes |

### Features

- **Versioned consent** — bump `CONSENT_VERSION` to re-prompt after policy changes
- **Privacy Policy & Terms links** — configurable URLs displayed in the banner
- **`useCookieConsent()` hook** — any component can reactively check consent status; used by ad components to block/show marketing creatives
- **Custom event dispatch** — `cookie-consent-change` event for cross-component communication
- **Smooth slide-up animation** — `animate-slide-up` CSS keyframe
- **Dark mode support** — adapts to site theme
- **Accessible** — `role="dialog"`, `aria-label`, keyboard-navigable

### Admin Settings (Privacy Tab)

| Field | Description |
| --- | --- |
| Enable Cookie Banner | Toggle the banner on/off |
| Banner Message | Customizable consent text (max 2,000 chars) |
| Privacy Policy URL | Link displayed in banner |
| Terms of Service URL | Link displayed in banner |
| GDPR Mode | Enable per-category consent controls |

---

## Analytics Integration

Google Analytics 4 is **consent-aware** and **admin-configurable** — no code changes needed:

1. Admin enters GA4 Measurement ID (`G-XXXXXXXXXX`) in **Settings → SEO → Analytics**
2. The `AnalyticsScripts` component conditionally injects the GA4 script

### Behavior

| Scenario | Result |
| --- | --- |
| No GA ID configured | Nothing injected |
| GDPR off | GA4 loads immediately after consent banner dismissed |
| GDPR on, analytics not accepted | GA4 **blocked** until user opts in |
| GDPR on, analytics accepted | GA4 loads with `anonymize_ip: true` |

### Technical Details

- Uses Next.js `<Script>` component with `afterInteractive` strategy
- Reads consent state from `useCookieConsent()` hook (reactive — loads instantly when user accepts)
- Cookie flags: `SameSite=None; Secure`
- IP anonymization enabled by default

---

## Settings & Theming

### Settings (10 Tabs, 110+ Fields)

| Tab | Key Settings |
| --- | --- |
| **General** | Site name, tagline, description, URL, logo, favicon, language, timezone |
| **Appearance** | Primary/secondary/accent colors, font family, heading font, dark mode toggle/default, custom CSS, top bar config |
| **Content** | Posts per page, excerpt length, RSS, blog layout (grid/list/columns), sidebar widgets, related posts, social sharing, TOC, post navigation, show/hide toggles |
| **Comments** | Enable/disable, moderation, auto-approve, voting, threading, guest comments, max reply depth, close after days, edit window |
| **Social** | Social media profile links, contact info, footer text |
| **SEO** | Google Analytics ID, search verification codes, custom robots.txt, custom head code |
| **Email** | SMTP config, from address, notification toggles, welcome email, digest |
| **Security** | CAPTCHA provider config, per-form requirements, registration toggle |
| **Privacy** | Cookie consent toggle, banner message, privacy/terms URLs, GDPR mode |
| **Advanced** | Custom head/footer code injection |

### Theme System

- Full color palette (50–950 shades, Tailwind-compatible)
- Gradient definitions (linear, radial, conic)
- Shadow system (sm → 2xl)
- Typography scale with fluid sizing
- CSS custom property generation
- Theme presets (light, dark, high-contrast)

### Third-Party Integrations

- Google Analytics 4 (consent-aware injection)
- Google Tag Manager
- Facebook Pixel
- Hotjar
- Microsoft Clarity

---

## Menu Builder

Visual menu builder for 3 slots:

| Slot | Description |
| --- | --- |
| **Header** | Main navigation menu |
| **Footer** | Footer navigation links |
| **Top Bar** | Top bar quick links |

### Features

- Add/edit/delete menu items with label, URL, target, visibility
- Nested items with parent-child relationships
- Drag handle for reordering
- Multiple menus per slot
- Default menus auto-scaffolded on first use

### Advanced Type System

- 8 item types: page, post, category, tag, route, custom, separator, heading
- 6 appearance styles: link, primary, outline, ghost, danger, accent
- Mega menu support with column layouts
- Visibility rules (auth state, roles, device, time window)
- Badge support with variants
- Version history with rollback

---

## Cron & Automation

**18 automated maintenance tasks**, triggered hourly via Vercel Cron or manual trigger:

| Task | Description |
| --- | --- |
| Publish scheduled posts | Publishes posts where `scheduledFor ≤ now` |
| Publish scheduled pages | Same for pages |
| Release stale post locks | Unlocks posts locked too long |
| Release stale page locks | Same for pages |
| Cleanup orphaned tags | Removes tags with zero usage |
| SEO volume history cleanup | Prunes old keyword volume data |
| Cleanup orphaned media | Removes unattached media files |
| Purge deleted media | Hard-deletes soft-deleted media past retention |
| Purge spam comments | Removes aged spam comments |
| Purge deleted comments | Hard-deletes soft-deleted comments |
| Purge CAPTCHA attempts | Cleans expired challenge records |
| Purge old ad logs | Removes aged impression/click logs |
| Deactivate expired placements | Disables ad placements past end date |
| Sync ad slot page types | Refreshes page type assignments |
| Process scheduled distributions | Executes pending social distributions |
| Cleanup distribution records | Prunes old distribution history |
| Cleanup expired sessions | Removes expired auth sessions/tokens |
| Cleanup old cron logs | Prunes old execution history |

### Configuration

```json
// vercel.json
{
  "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }]
}
```

### Admin Interface

- Module-gated display (hidden when parent module disabled)
- Manual trigger button with auth secret
- Execution history with pagination and expandable per-task results
- Duration tracking per run

---

## Authentication & Security

### Authentication

- **NextAuth v5** (Auth.js) with Credentials provider
- **JWT session strategy** with token refresh
- **bcrypt 6** password hashing
- **6 user roles**: Subscriber, Contributor, Author, Editor, Administrator, Super Admin
- **CAPTCHA-protected** login and registration (direct server-side verification — no self-fetch)
- **Password strength enforcement**: 12+ chars, uppercase, lowercase, digit, special char, no common passwords

### Authorization

- Server-side auth guard on admin layout (checks role before rendering)
- Route-level auth guards on all admin API endpoints
- Role-based permission checks (Author+, Editor+, Admin+)
- `authorId` derived from session (not client body)
- Email PII excluded from public API responses

### Security Headers

Applied to all routes via `next.config.ts`:

```text
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' ...
```

The CSP is scoped to allow Cloudflare Turnstile, Google reCAPTCHA, hCaptcha, and Google Analytics while blocking everything else.

### Additional Protections

- XSS-safe HTML sanitization (allowlist-based via `sanitize-html`)
- Slug sanitization on all content creation/update
- Slug uniqueness validation
- Username collision loop guard (max 100 attempts)
- Open redirect protection on login callback URLs
- `poweredByHeader: false` (no X-Powered-By header)
- `server-only` imports prevent accidental client-side usage of server code

---

## Middleware & Rate Limiting

The root middleware (`src/middleware.ts`) runs on all `/api/*` routes:

### CRON Secret Gate

- Requests to `/api/cron` must include a valid secret via `x-cron-secret` header or `Authorization: Bearer <secret>`
- Verified against the `CRON_SECRET` environment variable
- Returns `401 Unauthorized` on mismatch

### API Rate Limiting

- **30 mutations per 60 seconds** per IP (sliding window)
- Only applies to non-GET methods (POST, PATCH, PUT, DELETE)
- Skips `/api/auth` routes (NextAuth handles its own rate limiting)
- Powered by `@upstash/ratelimit` with Upstash Redis
- **Fails open** — if Redis is unavailable, requests are allowed through
- Returns `429 Too Many Requests` with `Retry-After: 60` header when rate-limited
- Lazy-initialized singleton client

---

## Health Check

`GET /api/health` — lightweight endpoint for Docker HEALTHCHECK, load balancers, and uptime monitors.

### Response

```json
{
  "status": "ok",        // "ok" | "degraded"
  "uptime": 3600,        // process uptime in seconds
  "latency": 12,         // health check duration in ms
  "db": "ok",            // "ok" | "error"
  "redis": "ok"          // "ok" | "unavailable"
}
```

- Returns **200** when database is reachable (Redis is optional)
- Returns **503** when database is down
- Used by Dockerfile HEALTHCHECK (every 30s, 5s timeout, 15s start period)

---

## Deployment

### Vercel (Recommended for Serverless)

```bash
# Build
npm run build

# Deploy
vercel deploy --prod
```

The project includes `vercel.json` with:
- Hourly cron job at `/api/cron`
- Extended function timeouts (60s for cron, 30s for upload)

### Docker / VPS (Self-Hosted)

#### Quick Start with Docker Compose

```bash
# Start PostgreSQL + Redis (development infrastructure)
docker compose up -d postgres redis

# Full stack (app + postgres + redis)
docker compose --profile full up -d
```

#### Dockerfile Details

Multi-stage build on `node:22-alpine`:

| Stage | Purpose |
| --- | --- |
| **deps** | `npm ci` + `prisma generate` |
| **builder** | `next build` → standalone output |
| **runner** | Minimal production image, non-root user (`nextjs`), HEALTHCHECK |

```bash
# Build and run manually
docker build -t myblog .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH_SECRET="..." \
  myblog
```

The container automatically runs `prisma migrate deploy` before starting the server.

#### Docker Compose Services

| Service | Image | Port | Notes |
| --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | 5432 | Persistent volume, healthcheck |
| `redis` | `redis:7-alpine` | 6379 | Persistent volume, healthcheck |
| `app` | Built from Dockerfile | 3000 | Depends on postgres + redis (healthy), behind `full` profile |

### Environment Requirements

| Requirement | Vercel | Docker/VPS |
| --- | --- | --- |
| Node.js | Managed | 22 (pinned in `.nvmrc`) |
| PostgreSQL | External (Neon, Supabase) | Included in docker-compose |
| Redis | External (Upstash) | Included in docker-compose |
| `DATABASE_URL` | Required | Required |
| `AUTH_SECRET` | Required | Required |
| `CRON_SECRET` | Recommended | Recommended |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Not needed | Recommended for rolling deploys |

### Standalone Output

Next.js is configured with `output: "standalone"` which produces a self-contained `server.js` that bundles only the needed `node_modules`. This reduces the Docker image size significantly and eliminates the need for a full `node_modules` directory in production.

---

## UI Component Library

Reusable components in `src/components/ui/`:

| Component | Description |
| --- | --- |
| **Button** | Styled button with loading state, icon support, disabled styles |
| **Card** | Container with header, title, padding sizes, hover effects |
| **Badge** | 6 variants: default, success, warning, danger, info, outline |
| **Avatar** | User avatar display |
| **DataTable** | Generic typed table with column defs, skeleton loading, empty states |
| **Pagination** | Page navigation with prev/next |
| **Input / Textarea / Select** | Form fields with labels, errors, hints, icons, dark mode |
| **Modal** | Headless UI dialog with transitions, 5 sizes, backdrop blur |
| **ConfirmDialog** | Destructive action confirmation |
| **Toast** | Global notifications (success/error/info/warning), auto-dismiss |
| **PasswordStrengthIndicator** | Live password policy checker with visual strength meter |

### Layout Components

| Component | Description |
| --- | --- |
| **PublicShell** | Public layout wrapper — fetches settings, renders TopBar + Header + Footer + CookieConsentBanner + AnalyticsScripts |
| **AdminShell** | Admin layout — sidebar nav, topbar with breadcrumbs, mobile menu, profile dropdown |
| **Header** | Responsive site header with navigation |
| **Footer** | Site footer with social links, contact info, sitemap link |
| **TopBar** | Configurable utility bar above header (phone, email, CTA, social links) |
| **CookieConsentBanner** | GDPR-compliant cookie consent with category management |
| **AnalyticsScripts** | Consent-aware GA4 script injection |

---

## What's Not in Git

The following are **intentionally excluded** from version control (`.gitignore`):

| Path | Reason |
| --- | --- |
| `/.next/` | Build output — regenerated by `npm run build` |
| `/node_modules/` | Dependencies — restored by `npm install` |
| `/out/` | Static export output |
| `.env*` | Environment secrets — use `.env.example` as template |
| `*.tsbuildinfo` | TypeScript incremental build cache |
| `.vercel/` | Vercel project config |
| `/tests/` | Test suites (Vitest, Jest, Playwright E2E) — local dev only |
| `/k6/` | k6 load testing scenarios — local dev only |
| `/coverage/` | Test coverage reports |
| `jest.config.ts` | Jest configuration |
| `vitest.config.ts` | Vitest configuration |
| `playwright.config.ts` | Playwright configuration |

> **Note**: `.env.example` is committed as a documented template. All other env files are excluded.

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Code Style

- TypeScript strict mode — no `any` in new code
- Feature-first architecture — all domain code lives in `src/features/<module>/`
- Server-only imports — use `import "server-only"` in all server files
- Zod validation on every API input
- Named exports preferred over default exports
- Barrel index files for public module API

---

## License

This is a private project. All rights reserved.

---

<p align="center">
  Built with Next.js 16 · React 19 · Prisma 7 · PostgreSQL 16 · Tailwind CSS 4<br/>
  <strong>277 source files · 67 API routes · 45 models · 12 feature modules</strong>
</p>
