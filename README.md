# MyBlog — Full-Stack Blog & CMS Platform

A production-ready, feature-rich blog platform and content management system built with **Next.js 16**, **React 19**, **Prisma 7**, and **PostgreSQL**. Includes a complete admin dashboard, rich text editor, SEO engine, ad management, social distribution, media library, CAPTCHA system, and more.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7.4.0-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
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
- [Settings & Theming](#settings--theming)
- [Menu Builder](#menu-builder)
- [Cron & Automation](#cron--automation)
- [Authentication & Security](#authentication--security)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Features Overview

| Category | Highlights |
|---|---|
| **Content Management** | Posts, pages, categories, tags, series, revisions, guest posts, scheduled publishing, soft delete |
| **Admin Dashboard** | 15-section admin panel with role-based access, module kill switches, responsive sidebar |
| **Rich Text Editor** | Custom WYSIWYG with 22 toggleable features, markdown shortcuts, drag-and-drop images, tables, code blocks, auto-save |
| **SEO Engine** | Per-content scoring (0–100), 8 audit categories, JSON-LD structured data, auto-sitemap, robots.txt, keyword tracking |
| **Media Library** | Grid/list views, folder tree, drag-and-drop/paste/URL upload, image optimization (WebP/AVIF), bulk operations, deduplication |
| **Comments** | Threaded comments, moderation queue, spam detection, upvoting, guest comments, per-post settings |
| **CAPTCHA** | 5 providers (Turnstile, reCAPTCHA v3, reCAPTCHA v2, hCaptcha, in-house) with automatic fallback chain |
| **Advertising** | Provider/slot/placement management, 11 ad networks, 30+ positions, 14 formats, global kill switch |
| **Distribution** | 12 social platforms, auto-publish, circuit breaker, rate limiting, health monitoring |
| **Authentication** | NextAuth v5, JWT sessions, bcrypt hashing, role-based authorization (6 roles), CAPTCHA-protected login |
| **Theming** | Dark mode, color customization, font selection, custom CSS injection, top bar configuration |
| **Automation** | 18 cron tasks, scheduled publishing, media cleanup, session purge, spam removal |
| **Menus** | Visual menu builder for header/footer/top bar, drag-and-drop reordering, nested items |
| **Settings** | 110+ configurable fields across 9 settings tabs, per-module kill switches |
| **SEO Redirects** | 301/302 redirect management with hit counting |
| **RSS** | Configurable RSS feed with customizable title |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React Compiler) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **UI** | [React 19](https://react.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [Headless UI](https://headlessui.com/), [Lucide Icons](https://lucide.dev/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) via [Prisma ORM 7](https://www.prisma.io/) |
| **Auth** | [NextAuth v5](https://authjs.dev/) (Auth.js) with Credentials provider |
| **Caching** | [Upstash Redis](https://upstash.com/) + rate limiting |
| **Validation** | [Zod 4](https://zod.dev/) |
| **Security** | bcrypt, sanitize-html, HSTS, CSP headers |
| **AI** | [OpenAI SDK](https://platform.openai.com/) (SEO suggestions, content assistance) |
| **Deployment** | [Vercel](https://vercel.com/) (configured), any Node.js host |

---

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── (public pages)      # Home, blog, about, contact, search, tags, auth
│   ├── admin/              # Admin dashboard (15 sections)
│   └── api/                # REST API endpoints (15 modules)
├── components/
│   ├── blog/               # Blog-specific components (TOC, sidebar, social share)
│   ├── layout/             # Shell components (header, footer, providers, top bar)
│   └── ui/                 # Reusable UI library (button, card, modal, toast, table)
├── features/               # Domain modules (12 feature modules)
│   ├── ads/                # Advertising management
│   ├── auth/               # Authentication & user services
│   ├── blog/               # Blog listing & rendering
│   ├── captcha/            # Multi-provider CAPTCHA system
│   ├── comments/           # Comment system & moderation
│   ├── distribution/       # Social media distribution
│   ├── editor/             # Rich text WYSIWYG editor
│   ├── media/              # Media library & processing
│   ├── pages/              # Static page management
│   ├── seo/                # SEO audit engine & tools
│   ├── settings/           # Site settings, theme, menu builder
│   └── tags/               # Tag management & deduplication
├── server/
│   ├── auth.ts             # NextAuth v5 configuration
│   ├── cache/              # Redis caching layer
│   ├── db/                 # Prisma client singleton
│   ├── env/                # Zod-validated environment variables
│   └── observability/      # Structured logging
└── types/                  # Shared TypeScript types
```

Each feature module follows a consistent structure:

```
feature/
├── index.ts                # Public re-exports
├── types.ts                # TypeScript types & interfaces
├── server/                 # Server-side services, schemas, repositories
├── ui/                     # React components
└── utils/                  # Shared utilities
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 15+
- **npm** (or pnpm/yarn)

### Installation

```bash
# Clone the repository
git clone https://github.com/engremran07/blogs.git
cd blogs

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets (see below)

# Push database schema
npx prisma db push

# Seed the database (optional — creates demo data)
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Required ─────────────────────────────────────────────────
DATABASE_URL="postgresql://user:password@localhost:5432/myblog"
AUTH_SECRET="your-auth-secret-min-32-chars-long"

# ── Optional — Redis caching & rate limiting ─────────────────
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# ── Optional — Site URL (OG tags, sitemap, distribution) ────
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# ── Optional — AI features ──────────────────────────────────
OPENAI_API_KEY=""

# ── Optional — Cron authentication ──────────────────────────
CRON_SECRET=""

# ── Optional — CAPTCHA providers ─────────────────────────────
CLOUDFLARE_TURNSTILE_SECRET=""
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY=""
NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY=""
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=""

# ── Optional — S3 media storage (falls back to local fs) ────
S3_BUCKET=""
S3_REGION=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
S3_ENDPOINT=""
S3_PUBLIC_URL=""
```

> Only `DATABASE_URL` and `AUTH_SECRET` (production) are **required**. Everything else has sensible defaults or can be configured via the admin panel.

---

## Database Setup

```bash
# Push schema to database (development)
npx prisma db push

# Or use migrations (production)
npx prisma migrate dev

# Seed with demo data
npx prisma db seed

# Open Prisma Studio (visual database browser)
npx prisma studio
```

The schema defines **30+ models** covering users, posts, pages, categories, tags, comments, media, ads, distribution, SEO, settings, cron logs, and more.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Generate Prisma client + production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed database with demo data |

---

## Project Structure

### Prisma Schema (~1,770 lines)

| Model Group | Models |
|---|---|
| **Auth** | `User`, `UserSession`, `EmailVerificationToken`, `EmailChangeRequest` |
| **Content** | `Post`, `Page`, `Category`, `Tag`, `Series`, `PostRevision`, `PostQuote` |
| **Engagement** | `Comment`, `CommentVote`, `CommentSettings`, `LearningSignal` |
| **Media** | `Media`, `MediaVariant`, `MediaFolder`, `MediaTag` |
| **Ads** | `AdProvider`, `AdSlot`, `AdPlacement`, `AdLog` |
| **Distribution** | `DistributionChannel`, `DistributionRecord` |
| **SEO** | `SeoRedirect`, `SeoKeyword`, `SeoKeywordRelation`, `SeoSuggestion`, `SeoKeywordVolume` |
| **Settings** | `SiteSettings`, `CommentSettings` |
| **System** | `CronLog`, `PageType` |

---

## Admin Panel

The admin panel at `/admin` provides a full-featured CMS dashboard. Access requires `ADMINISTRATOR` or `SUPER_ADMIN` role.

### Dashboard

- Stats grid: Total Posts, Comments, Users, Views, Media Files
- Recent posts and comments at a glance

### Content Management

| Section | Features |
|---|---|
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
|---|---|
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
|---|---|
| **Settings** | 9 tabs, 110+ fields — General, Appearance, Content, Comments, Social, SEO, Email, Security, Advanced |
| **SEO** | Site-wide audit dashboard, per-content scoring, issue severity tracking, bulk fix page |
| **Ads** | Provider/slot/placement management, 11 networks, global kill switch, compliance panel |
| **Distribution** | 12 platforms, channel management, auto-publish, circuit breaker health, kill switch |
| **Menus** | Header/Footer/Top Bar builder, nested items, drag-and-drop reorder |
| **Cron** | 18 automated tasks, manual trigger, execution history with per-task results |

---

## Public Pages

| Page | Route | Description |
|---|---|---|
| **Home** | `/` | Hero section, featured post, latest posts grid, popular tags cloud |
| **Blog** | `/blog` | Configurable layout (grid/list), filters (tag, category, search, archive), pagination, sidebar |
| **Post** | `/blog/[slug]` | Full article with TOC, social sharing, related posts, prev/next navigation, comments, JSON-LD |
| **About** | `/about` | Dynamic stats, mission statement |
| **Contact** | `/contact` | Contact form with CAPTCHA, info cards |
| **Tags** | `/tags` | Featured tags, trending tags, tag cloud |
| **Tag Detail** | `/tags/[slug]` | Posts filtered by tag |
| **Search** | `/search` | Full-text search with real-time results |
| **Login** | `/login` | Email/password auth with CAPTCHA |
| **Register** | `/register` | Registration with password strength indicator and CAPTCHA |
| **Profile** | `/profile` | Edit profile, change password |

### Blog Components

| Component | Description |
|---|---|
| **Table of Contents** | Parses H1–H4, active heading tracking via IntersectionObserver, smooth scroll |
| **Blog Sidebar** | Configurable widgets: search, recent posts, categories, tags, monthly archive |
| **Social Share** | Facebook, Twitter, LinkedIn, WhatsApp, Email, Copy Link |
| **Related Posts** | Server-rendered, 3 posts by shared tags/categories |
| **Post Navigation** | Previous/Next links by publish date |
| **Share Overlay** | Hover overlay on post cards for quick sharing |

---

## API Reference

All API routes are under `/api/`. Admin endpoints require authentication and role-based authorization.

| Endpoint | Methods | Auth | Description |
|---|---|---|---|
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
| `/api/users/bulk` | POST | Admin+ | Bulk user operations |
| `/api/media` | GET, POST, PATCH, DELETE | Auth required | Media CRUD |
| `/api/media/bulk` | POST | Auth required | Bulk media operations |
| `/api/upload` | POST | Auth required | File upload |
| `/api/settings` | GET, PATCH | PATCH: Admin+ | Site settings |
| `/api/settings/[group]` | GET, PATCH | PATCH: Admin+ | Settings by group |
| `/api/settings/module-status` | GET | Public | Module enable/disable status |
| `/api/seo` | GET | Editor+ | SEO audit data |
| `/api/seo/redirects` | GET, POST, DELETE | Editor+ | SEO redirect management |
| `/api/ads` | GET, POST, PATCH, DELETE | Auth required | Ad management |
| `/api/distribution` | GET, POST, PATCH, DELETE | Auth required | Distribution management |
| `/api/captcha` | POST | Public | CAPTCHA challenge & verification |
| `/api/cron` | POST | Bearer token | Trigger cron tasks |

---

## Rich Text Editor

A custom-built WYSIWYG editor with 22 admin-toggleable features:

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

Multi-provider CAPTCHA with automatic fallback:

```
Turnstile → reCAPTCHA v3 → reCAPTCHA v2 → hCaptcha → In-house
```

| Provider | Type | Dependency |
|---|---|---|
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

---

## SEO Engine

### Audit System

- Per-content scoring (0–100) across 8 categories:
  - Meta, Content, Technical, Image, Linking, Structured Data, Social, Performance
- 4 issue severity tiers: **Critical**, **Important**, **Optional**, **Info**
- Site-wide aggregation with score distribution (excellent/good/needs work/poor)
- Worst-performing content list with actionable recommendations
- Bulk fix page for rapid corrections

### Structured Data

- Auto-generated **JSON-LD** on blog posts: `Article` + `BreadcrumbList`
- `WebSite` JSON-LD with `SearchAction` on root layout
- Support for 16 Schema.org types

### Auto-Generated Files

- **`sitemap.xml`** — Posts, pages, categories, tags, static routes (respects `noIndex`)
- **`robots.txt`** — Blocks AI scrapers (GPTBot, ChatGPT-User, CCBot, anthropic-ai, ClaudeBot), disallows admin/API paths

### Additional

- SEO redirect management (301/302) with hit counting
- Keyword tracking with volume history and trend analysis
- Search verification codes (Google, Bing, Yandex, Pinterest, Baidu)
- Canonical URLs, OpenGraph, Twitter Cards per post/page

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

- Local filesystem (default)
- S3-compatible storage (configurable via env vars)

---

## Advertising Module

Manage ads from 11 supported networks:

> AdSense · Google Ad Manager · Media.net · Amazon APS · Ezoic · Raptive · Monumetric · PropellerAds · Sovrn · Outbrain · Custom

### Management

- **Providers**: Name, type, credentials, priority, load strategy, kill switch
- **Slots**: 30+ positions, 14 formats, page type targeting, responsive flags, render priority, max dimensions
- **Placements**: Provider → Slot binding with start/end date scheduling
- **Overview**: Stats dashboard with impressions, clicks, CTR, revenue by provider and position
- **Compliance**: Compliance scan panel

### Controls

- Global kill switch to disable all ads instantly
- Per-provider enable/disable
- Module-level kill switch in settings

---

## Social Distribution

Distribute content across 12 platforms:

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

## Settings & Theming

### Settings (9 Tabs, 110+ Fields)

| Tab | Key Settings |
|---|---|
| **General** | Site name, tagline, description, URL, logo, favicon, language, timezone |
| **Appearance** | Primary/secondary/accent colors, font family, heading font, dark mode toggle/default, custom CSS, top bar config |
| **Content** | Posts per page, excerpt length, RSS, blog layout (grid/list/columns), sidebar widgets, related posts, social sharing, TOC, post navigation, show/hide toggles |
| **Comments** | Enable/disable, moderation, auto-approve, voting, threading, guest comments, max reply depth, close after days, edit window |
| **Social** | Social media profile links, contact info, footer text |
| **SEO** | Analytics ID, verification codes, custom robots.txt, custom head code |
| **Email** | SMTP config, from address, notification toggles, welcome email, digest |
| **Security** | CAPTCHA provider config, per-form requirements, registration toggle |
| **Advanced** | Custom footer code injection |

### Theme System

- Full color palette (50–950 shades, Tailwind-compatible)
- Gradient definitions (linear, radial, conic)
- Shadow system (sm → 2xl)
- Typography scale with fluid sizing
- CSS custom property generation
- Theme presets (light, dark, high-contrast)

### Third-Party Integrations

- Google Tag Manager
- Facebook Pixel
- Hotjar
- Microsoft Clarity

---

## Menu Builder

Visual menu builder for 3 slots:

| Slot | Description |
|---|---|
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

18 automated maintenance tasks, triggered hourly via Vercel Cron or manual trigger:

| Task | Description |
|---|---|
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
- **bcrypt** password hashing
- **6 user roles**: Subscriber, Contributor, Author, Editor, Administrator, Super Admin
- **CAPTCHA-protected** login and registration
- **Password strength enforcement** (12+ chars, uppercase, lowercase, digit, special char, no common passwords)

### Authorization

- Route-level auth guards on all admin API endpoints
- Role-based permission checks (Author+, Editor+, Admin+)
- Admin panel access restricted to Administrator/Super Admin
- `authorId` derived from session (not client body)
- Email PII excluded from public API responses

### Security Headers

```
X-DNS-Prefetch-Control: on
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### Additional Protections

- XSS-safe HTML sanitization (allowlist-based)
- Slug sanitization on all content creation/update
- Slug uniqueness validation
- Username collision loop guard (max 100 attempts)
- Open redirect protection on login callback URLs
- `poweredByHeader: false` (no X-Powered-By header)

---

## Deployment

### Vercel (Recommended)

The project includes `vercel.json` with hourly cron and extended function timeouts:

```bash
npm run build
vercel deploy
```

### Any Node.js Host

```bash
# Build
npm run build

# Start production server
npm start
```

### Environment Requirements

- Node.js 20+
- PostgreSQL 15+
- `DATABASE_URL` and `AUTH_SECRET` environment variables

---

## UI Component Library

Reusable components in `src/components/ui/`:

| Component | Description |
|---|---|
| **Button** | Styled button with variants |
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

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

This is a private project. All rights reserved.

---

<p align="center">Built with Next.js, React, Prisma, and PostgreSQL</p>
