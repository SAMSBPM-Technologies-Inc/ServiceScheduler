# Architecture

## Overview

ServStack is a multi-tenant SaaS platform deployed entirely on Cloudflare's edge infrastructure. It uses a serverless architecture with no persistent servers.

```
┌─────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                      │
│                                                          │
│   ┌─────────────────────┐    ┌────────────────────────┐ │
│   │   Cloudflare Pages  │    │  Cloudflare Workers    │ │
│   │   (Frontend SPA)    │◄──►│  (Backend API)         │ │
│   │   servstack.ca      │    │  api.servstack.ca      │ │
│   └─────────────────────┘    └──────────┬─────────────┘ │
│                                         │               │
│                                   ┌─────▼──────┐        │
│                                   │ Cloudflare │        │
│                                   │     D1     │        │
│                                   │ (SQLite)   │        │
│                                   └────────────┘        │
└─────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Stripe (external) │
                    │  Checkout + Webhooks│
                    └────────────────────┘
```

---

## Frontend

**Technology:** React 18, TypeScript, Vite, TanStack Query, Axios, Tailwind CSS

**Hosting:** Cloudflare Pages at `https://servstack.ca`

**Structure — three separate portal UIs within one SPA:**

```
/admin/*        — Platform Admin portal (manages all vendors)
/vendor/*       — Vendor Admin/Worker portal (manage own business)
/portal/:slug/* — Customer portal (per-vendor, branded)
```

Each portal has its own authentication context, API client, and layout. They share common UI components and the Vite build.

**State Management:**
- Server state: TanStack Query (caching, refetching, mutations)
- Local state: React `useState`/`useReducer`
- Auth tokens: `localStorage` (`platform_token`, `vendor_token`, `customer_token`)

**Routing:** React Router v6 with nested routes

---

## Backend

**Technology:** Cloudflare Workers, TypeScript, Hono (HTTP framework), Prisma ORM

**Hosting:** Cloudflare Workers at `https://api.servstack.ca`

**Entry point:** `src/worker.ts` — registers all route modules with Hono

**Route structure:**
```
/api/vendor/auth          — Vendor login, register, profile, team
/api/vendor/products      — Product CRUD
/api/vendor/plans         — Plan CRUD
/api/vendor/subscriptions — View/manage subscriptions
/api/vendor/categories    — Category and sub-category CRUD
/api/payments/*           — Stripe Checkout, webhook
/api/customer/auth        — Customer login, register, profile
/api/customer/plans       — Browse plans
/api/customer/subscriptions — Subscribe, view, manage
/api/platform/auth        — Platform admin login
/api/platform/vendors     — Platform admin: vendor management
/api/platform/customers   — Platform admin: customer management
```

**Runtime constraints:**
- Workers run in a V8 isolate — no Node.js APIs by default (uses `nodejs_compat` flag)
- No interactive transactions — must use batch `prisma.$transaction([...])` with arrays of Prisma operations
- Cold starts are minimised by Cloudflare's edge caching

---

## Database

**Technology:** Cloudflare D1 (managed SQLite at the edge)

**ORM:** Prisma with the D1 driver adapter (`@prisma/adapter-d1`)

**Key characteristics:**
- SQLite under the hood — no native enum types (stored as `String`, validated by Zod)
- JSON stored as strings — `ConfigurablePlanProduct.allowedTiers` and `pricePerTier` must be `JSON.parse()`d on read
- Migrations managed via `wrangler d1 migrations apply`
- Accessed from the Worker via the `DB` D1 binding

---

## Multi-tenancy

Each vendor is a fully isolated tenant. All queries that could return cross-vendor data filter by `vendorId` extracted from the JWT.

The vendor's `vendorId` is embedded in the JWT at login. Middleware extracts it and passes it to route handlers via Hono context. No route handler trusts a `vendorId` from the request body for data access.

---

## Authentication

Three separate authentication contexts, each with its own JWT payload type:

| Token | Stored as | JWT type claim | Secret |
|-------|-----------|----------------|--------|
| Platform Admin | `platform_token` | `platform_admin` | `JWT_VENDOR_SECRET` |
| Vendor / VendorUser | `vendor_token` | `vendor` | `JWT_VENDOR_SECRET` |
| Customer | `customer_token` | `customer` | `JWT_CUSTOMER_SECRET` |

All tokens are JWTs signed with HMAC-SHA256. Middleware validates the token and checks the `type` claim before granting access.

See [Security](security.md) for full details.

---

## Payments (Stripe)

Payment flow:
1. Customer initiates subscription → backend creates Stripe Checkout session
2. Customer is redirected to Stripe-hosted payment page
3. On success, Stripe sends a `checkout.session.completed` webhook to `/api/payments/webhook`
4. Webhook handler marks the payment as `PAID` and subscription as `ACTIVE`

Vendors can bring their own Stripe account. Stripe keys are stored encrypted (AES-256-GCM) in D1. If no vendor keys are configured, the platform's Stripe keys are used as fallback.

---

## Infrastructure Summary

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Cloudflare Pages | `https://servstack.ca` |
| API | Cloudflare Workers | `https://api.servstack.ca` |
| Database | Cloudflare D1 | Bound as `DB` |
| Payments | Stripe | External |

No VMs, containers, or persistent servers are used. All compute is serverless and runs at the Cloudflare edge.


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*