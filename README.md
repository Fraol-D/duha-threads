This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), extended for a T‑shirt e-commerce platform foundation (Duha Threads).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Project Structure (Added)

```
src/
	app/                # App Router pages & API routes
		api/health/       # Basic health check endpoint
	components/         # Reusable UI components (Header, Footer, Container)
	config/env.ts       # Centralized validated env access (zod)
	lib/db/connection.ts# Mongoose connection helper with global cache
	lib/logger.ts       # Logging abstraction (swap later for real service)
	lib/db/models/      # (Future) Mongoose models go here
	lib/auth/           # Auth helpers (password hashing, JWT, session)
	types/              # (Future) Shared TypeScript types
```

## Environment Variables

Define vars in `.env.local` (copy from `.env.example`). They are validated by `src/config/env.ts` using zod.

Required now:

- `MONGODB_URI` (empty string allowed in dev; connection skipped)
- `AUTH_JWT_SECRET` (>=32 chars, used to sign auth tokens)

Optional (placeholders for future features):

- `EMAIL_API_KEY`
- `APP_BASE_URL`

## Authentication Endpoints (Added)

- `POST /api/auth/signup` — Create account, sets HTTP-only `auth_token` cookie.
- `POST /api/auth/login` — Authenticate credentials, sets cookie.
- `POST /api/auth/logout` — Clears auth cookie.
- `GET /api/user/me` — Returns current user (sanitized).
- `PATCH /api/user/me` — Updates profile & marketing preferences.

Use `getCurrentUser()` in server components or route handlers to access the logged-in user. The `hashedPassword` field is never returned to clients.

## Using the DB Connection

In an API route or server component:

```ts
import { getDb } from "@/lib/db/connection";
const mongooseInstance = await getDb();
// Add / import models then use mongooseInstance.connection.db
```

The helper caches connections in development to avoid multiple concurrent opens during hot reload.

## Adding New Env Vars

Extend the zod `schema` in `src/config/env.ts`, then reference via `env.YOUR_VAR`. This ensures a single source of truth.

## Health Endpoint

`GET /api/health` returns JSON: `{ status: "ok", db: "connected|no-uri|error", env: "development|production|test" }`.

## Tailwind UI Shell

`layout.tsx` wires `Header`, `Footer`, and a responsive container. Adjust spacing via utility classes in `globals.css` or components.

## Next Steps (Not Implemented Yet)

- Product models & CRUD routes
- Cart, checkout, custom design builder
- Admin analytics & email integration
- Error tracking & structured logging service
- Password reset & email verification flows
- Rate limiting / brute force protection on auth endpoints

## Deployment

Deploy with Vercel or your preferred platform. Ensure env vars are set in the host environment.
