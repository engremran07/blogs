# CLAUDE.md — Project Instructions for AI Agents

## Project Overview

MyBlog is a full-stack blog/CMS platform built on **Next.js 16** (App Router), **React 19**, **Prisma 7** (PostgreSQL), and **TypeScript** in strict mode.

## Tech Stack

- **Framework**: Next.js 16.1.x with App Router (RSC + client components)
- **UI**: React 19, Tailwind CSS, Lucide icons, clsx
- **ORM**: Prisma 7.x with PostgreSQL
- **Auth**: NextAuth v5 (`next-auth@5`) with credentials + session
- **State**: Server components by default, `"use client"` only when needed
- **Cache**: ISR with `revalidate = 86400`, in-memory settings cache, optional Upstash Redis

## Project Structure

```text
src/
  app/
    (admin)/admin/       # Admin panel (protected)
    (public)/            # Public-facing pages
    api/                 # API route handlers
  components/
    admin/admin-bar/     # Global admin bar (WordPress-style)
    layout/              # TopBar, Footer, etc.
    ui/                  # Shared UI components
  features/
    auth/                # Authentication logic + types
    pages/               # Page CRUD service + schemas
    posts/               # Post CRUD service + schemas
    settings/            # Site settings service
  server/
    db/                  # Prisma client singleton
    env/                 # Zod-validated env schema
    api-auth.ts          # requireAuth() guard
    wiring.ts            # DI wiring for services
```

## Key Conventions

### API Routes

- All API routes use `NextRequest`/`NextResponse` from `next/server`
- Auth guard: `const { userId, userRole, errorResponse } = await requireAuth({ level: "admin" })`
- Always return `{ success: boolean, data?, error? }` shape
- Validate request body with Zod schemas

### Services

- Services use constructor DI (Prisma client, cache, logger injected)
- Wired in `src/server/wiring.ts`
- In-memory cache pattern: `private cached: T | null = null` with invalidation on write

### Components

- Server components by default; add `"use client"` only for interactivity
- Admin editor pattern: local `form` state + `update()` helper + `handleSave()` that POSTs/PATCHes
- Use Lucide icons (named imports from `lucide-react`)
- Use `clsx` for conditional classes (not classnames or cn)

### Database

- Prisma schema at `prisma/schema.prisma`
- Pages and Posts are separate models (not polymorphic)
- Pages do NOT have tags (tags are posts-only)
- Pages do NOT have code injection fields in the editor UI (DB fields exist but are unused)
- Soft delete pattern: `deletedAt DateTime?`
- Always filter with `deletedAt: null` in queries

### SEO / Meta

- OG image fallback chain: `ogImage || featuredImage`
- Meta title fallback: `metaTitle || title`
- Meta description fallback: `metaDescription || excerpt`
- Canonical URL: `canonicalUrl || computed from slug`
- Posts live at `/blog/{slug}`, Pages live at `/{slug}`

### Settings & Appearances

- Settings saved via `PATCH /api/settings`
- After saving settings, `revalidatePath('/', 'layout')` invalidates ISR cache
- Settings service has in-memory cache that self-invalidates on update

### Sitemap

- XSLT-styled categorized sitemap at `/sitemap.xml`
- Sub-sitemaps: `/sitemap-posts.xml`, `/sitemap-pages.xml`, `/sitemap-categories.xml`, `/sitemap-tags.xml`
- XSLT stylesheet at `/sitemap-style.xsl` renders styled HTML tables

### Admin Bar

- Single admin bar across admin panel and frontend (no duplicate headers)
- AdminShell provides sidebar + mobile toggle; AdminBar provides top bar functions
- AdminBar has: LeftZone (nav), ContextZone (status), RightZone (theme, new, user, save)

### Cron

- Single endpoint: `GET /api/cron` with `Authorization: Bearer CRON_SECRET`
- 25+ tasks with distributed lock, 30s timeout, kill-switch gating
- `CRON_SECRET` is required in production (min 16 chars)

## Common Pitfalls (Do NOT)

1. Do NOT add tags to pages (tags are posts-only)
2. Do NOT add code injection fields to page/post editors
3. Do NOT call `/api/auth/register` for admin user creation — use `POST /api/users`
4. Do NOT forget `revalidatePath` after settings updates
5. Do NOT create a second header bar in AdminShell (AdminBar handles everything)
6. Do NOT use `as any` or `as unknown as T` casts — fix types properly
7. Do NOT skip `deletedAt: null` filters in Prisma queries
8. Do NOT make CRON_SECRET optional in production

## Running

```bash
npm install
npx prisma generate
npx prisma db push       # or: npx prisma migrate deploy
npm run dev               # http://localhost:3000
npm run build             # production build
```

## Environment

Copy `.env.example` to `.env` and fill in values. Required in production:

- `DATABASE_URL`
- `AUTH_SECRET` (min 32 chars)
- `CRON_SECRET` (min 16 chars)
