# Development Setup

## Prerequisites

- Node.js 18+
- npm 9+
- A Cloudflare account (for D1 and Workers)
- Wrangler CLI (`npm install -D wrangler` in the backend)

---

## Repository Structure

```
ServiceScheduler/
  ├── frontend/          — React SPA (Cloudflare Pages)
  ├── backend/           — Cloudflare Worker + Prisma (API)
  └── docs/              — Documentation
```

---

## Backend Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 3. Set up local D1 database

```bash
# Apply migrations locally
npx wrangler d1 migrations apply service_scheduler --local
```

This creates a local SQLite file under `.wrangler/state/`.

### 4. Configure local secrets

Create `backend/.dev.vars`:

```
JWT_VENDOR_SECRET=dev-vendor-secret-change-in-prod
JWT_CUSTOMER_SECRET=dev-customer-secret-change-in-prod
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
ENCRYPTION_KEY=
```

> `.dev.vars` is gitignored. Never commit this file.

### 5. Generate Prisma client

```bash
npx prisma generate
```

### 6. Start the local development server

```bash
npx wrangler dev
```

The API runs at `http://localhost:8787`.

---

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure the API URL

The frontend reads the API base URL from an environment variable. For local development, create `frontend/.env.local`:

```
VITE_API_URL=http://localhost:8787
```

For production this is set to `https://api.servstack.ca` via the Cloudflare Pages build configuration.

### 3. Start the development server

```bash
npm run dev
```

The frontend runs at `http://localhost:5173`.

---

## Running Both Together

Start the backend in one terminal, the frontend in another. The frontend proxies API calls to the local Worker at port 8787.

---

## Prisma Workflow

When you change `schema.prisma`:

1. Write the migration SQL in `prisma/migrations/<timestamp>_<name>/migration.sql`
2. Apply locally: `npx wrangler d1 migrations apply service_scheduler --local`
3. Regenerate the client: `npx prisma generate`
4. Test your changes
5. Apply to remote when ready: `npx wrangler d1 migrations apply service_scheduler --remote`

See [Database Migrations](migrations.md) for full details.

---

## Key Technical Notes

### No Interactive Transactions

Cloudflare Workers + Prisma D1 do not support interactive transactions (`prisma.$transaction(async (tx) => {...})`). Use the batch form instead:

```typescript
await prisma.$transaction([
  prisma.foo.create({ data: ... }),
  prisma.bar.update({ where: ..., data: ... }),
])
```

### JSON Fields in D1

`ConfigurablePlanProduct.allowedTiers` and `pricePerTier` are stored as JSON strings (D1 has no JSON column type). Always parse before use:

```typescript
const tiers = JSON.parse(cp.allowedTiers) as string[]
const prices = JSON.parse(cp.pricePerTier) as Record<string, number>
```

The `parseCp()` helper in `vendor/plans.ts` does this automatically.

### Prisma `orderBy` Placement

`orderBy` on a relation query must be a sibling of `include`, not inside it:

```typescript
// CORRECT
productGroups: {
  orderBy: { sortOrder: 'asc' },
  include: { items: true }
}

// WRONG — causes 500
productGroups: {
  include: {
    orderBy: { sortOrder: 'asc' },  // Prisma treats this as a relation named "orderBy"
    items: true
  }
}
```

---

## Useful Commands

| Task | Command |
|------|---------|
| Start API locally | `cd backend && npx wrangler dev` |
| Start frontend locally | `cd frontend && npm run dev` |
| Apply local migrations | `cd backend && npx wrangler d1 migrations apply service_scheduler --local` |
| Apply remote migrations | `cd backend && npx wrangler d1 migrations apply service_scheduler --remote` |
| Regenerate Prisma types | `cd backend && npx prisma generate` |
| Deploy API | `cd backend && npx wrangler deploy` |
| Deploy frontend | `cd frontend && npm run build` (then push to trigger Pages deploy) |
| Query local D1 | `cd backend && npx wrangler d1 execute service_scheduler --local --command "SELECT ..."` |
| Query remote D1 | `cd backend && npx wrangler d1 execute service_scheduler --remote --command "SELECT ..."` |
| View live API logs | `cd backend && npx wrangler tail` |


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*