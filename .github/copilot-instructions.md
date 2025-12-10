# Duha Threads – AI Working Guide

## Stack & Commands

- Next.js 16 App Router app lives under `src/app`; server components by default, add `"use client"` only when you need hooks or browser APIs.
- Run `npm run dev` for local work, `npm run build && npm run start` for production checks, `npm run lint` before commits; Node 20.x is required (see `package.json`).
- Use `node test-db-connection.js` to verify Mongo connectivity and list collections before debugging API handlers.

## Layout & Shared Providers

- `src/app/layout.tsx` sets up Geist fonts, global Tailwind tokens, `CartProvider`, `WishlistProvider`, `Header`, and `Footer`; new pages should assume these contexts already wrap children.
- Keep visual shells inside `src/components` (e.g., `Container`, `Header`, `Footer`) so server components stay focused on data loading.

## Data & Env

- Central env validation lives in `src/config/env.ts`; always extend the zod `schema` when adding variables and read them via the exported `env` object.
- MongoDB access goes through `src/lib/db/connection.ts::getDb`, which caches the connection per process—never call `mongoose.connect` directly.
- Schemas reside in `src/lib/db/models/*`; update these when introducing new fields so both API routes and server components can rely on consistent shapes.

## Auth & Session Flow

- Auth tokens are JWTs stored in the `auth_token` HTTP-only cookie (see `src/lib/auth/token.ts`).
- Use `getCurrentUser()` from `src/lib/auth/session.ts` inside server components and `verifyAuth()` inside API routes to enforce access control.
- Signup/login handlers (`src/app/api/auth/signup|login/route.ts`) show the expected pattern: zod validation, `getDb`, Mongoose query, `toPublicUser` sanitization, and `attachAuthCookie`.

## Home & Product Queries

- `src/app/page.tsx` fetches hero and featured products plus testimonial data before rendering the client-only `HomeClient`; mimic this split (load data server-side, hand to a thin client component) for new pages.
- Query helpers under `src/lib/products/queries.ts` and `src/lib/reviews/queries.ts` short-circuit when `MONGODB_URI` is missing—preserve that behavior so the app still boots without a database.

## Design & Event Telemetry

- The customizer relies on `DesignAssistant` (`src/components/DesignAssistant.tsx`), which hits `/api/templates` and `/api/ai/design-suggestions`; keep API contracts compatible when evolving those endpoints.
- Template data is served from the `DesignTemplate` model and filtered/paginated in `src/app/api/templates/route.ts`.
- Client interactions should call `logEvent` (`src/lib/loggerEvents.ts`), which stores documents via `/api/events`; this endpoint also increments template `usageCount`.

## Domain Models & Orders

- Orders support both legacy and new statuses plus flattened vs structured delivery info (`src/lib/db/models/Order.ts`); do not drop legacy fields without a migration plan.
- `UserModel` tracks roles and marketing opt-ins, and admin promotion is controlled via `ADMIN_EMAILS` in the env config.
- Product documents include featured flags (`isHero`, `isFeatured`, `featuredRank`) and image arrays with `isPrimary`; queries assume those markers exist, so seed data accordingly.

## Client Patterns & UI

- Tailwind CSS v4 utilities live in `src/app/globals.css`; tokens like `--bg`/`--fg` are set on `<body>`, so prefer CSS variables for theming.
- Shared home sections sit in `src/components/home/*`; prefer composing these rather than recreating layouts inside pages.
- Analytics is handled by `@vercel/analytics` in the root layout; avoid duplicating analytics clients elsewhere.

## When Adding Features

- Place reusable server logic under `src/lib/**` and keep route handlers in `src/app/api/**/route.ts` so they can be tree-shaken.
- Always guard DB work with `await getDb()` and wrap external calls (Cloudinary, AI providers) in try/catch so public pages continue rendering on failures.
- Prefer returning sanitized DTOs from API routes (`toPublicUser`, derived product shapes) instead of leaking raw Mongoose documents to the client.
- Update manual testing docs in `MANUAL_TEST_*.md` whenever flows change; QA relies on them to verify storefront and admin flows.
