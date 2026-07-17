# Deployment Guide

ServStack is deployed to Cloudflare's edge infrastructure.

| Component | Service | URL |
|-----------|---------|-----|
| Frontend | Cloudflare Pages | `https://servstack.ca` |
| API | Cloudflare Workers | `https://api.servstack.ca` |
| Database | Cloudflare D1 | Binding: `DB` |

---

## Backend (Cloudflare Workers)

### Deploy the Worker

```bash
cd backend
npx wrangler deploy
```

This deploys `src/worker.ts` to Cloudflare Workers and routes all traffic matching `api.servstack.ca/*` to it (configured in `wrangler.jsonc`).

### Required Secrets

Before the first deploy, set all required Worker secrets:

```bash
cd backend

# JWT signing secrets — use long random strings
npx wrangler secret put JWT_VENDOR_SECRET
npx wrangler secret put JWT_CUSTOMER_SECRET

# Platform Stripe fallback keys
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# AES-256 key for encrypting vendor Stripe keys at rest
openssl rand -base64 32  # generate a key
npx wrangler secret put ENCRYPTION_KEY  # paste when prompted
```

Secrets are stored securely by Cloudflare and are never exposed in deployment artifacts.

### Environment Variables

Non-secret configuration is in `wrangler.jsonc`:

```jsonc
"vars": {
  "FRONTEND_URL": "https://servstack.ca"
}
```

Update `FRONTEND_URL` if deploying to a different domain.

### Apply Database Migrations

Before deploying a version that includes schema changes, apply migrations to the remote D1 database:

```bash
cd backend
npx wrangler d1 migrations apply service_scheduler --remote
```

Always apply migrations **before** deploying the Worker that depends on the new schema.

---

## Frontend (Cloudflare Pages)

### Build

```bash
cd frontend
npm run build
```

This produces a `dist/` directory with the compiled SPA.

### Deploy

The frontend is deployed via Cloudflare Pages. Connect your repository to Cloudflare Pages and configure:

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `frontend` |

Pages deploys automatically on push to the configured branch.

### Environment Variables (Pages)

Set in the Cloudflare Pages dashboard under **Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.servstack.ca` |

---

## Custom Domains

### API domain

`api.servstack.ca` is configured as a Worker route in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "api.servstack.ca/*", "zone_name": "servstack.ca" }
]
```

### Frontend domain

`servstack.ca` is configured as a Cloudflare Pages custom domain in the Pages dashboard.

### Vendor custom domains

Vendors can configure their own domain (e.g. `subscribe.vendor.com`) in their portal Settings. The domain must CNAME to `servstack.ca`. The frontend detects the host at runtime and resolves the vendor from the API using the custom domain.

---

## Platform Admin Bootstrap

The platform admin account is created via a bootstrap endpoint that only works when no admin exists yet:

```bash
curl -X POST https://api.servstack.ca/api/platform/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"strong-password"}'
```

After the first admin is created, this endpoint returns `409 Conflict`. There is no UI for registration — use the login page at `https://servstack.ca/admin`.

---

## Deployment Checklist

### First Deploy

- [ ] Run `npx wrangler login` and authenticate
- [ ] Set all required Worker secrets (`JWT_VENDOR_SECRET`, `JWT_CUSTOMER_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ENCRYPTION_KEY`)
- [ ] Apply database migrations: `npx wrangler d1 migrations apply service_scheduler --remote`
- [ ] Deploy the Worker: `npx wrangler deploy`
- [ ] Configure Cloudflare Pages and connect the repository
- [ ] Set `VITE_API_URL` in Pages environment variables
- [ ] Verify DNS for `api.servstack.ca` and `servstack.ca`
- [ ] Bootstrap the platform admin account

### Subsequent Deploys

- [ ] Apply any new migrations to remote D1 before deploying
- [ ] Run `npx wrangler deploy` for backend changes
- [ ] Push to the Pages branch for frontend changes (auto-deploys)

---

## Rollback

### Worker rollback

```bash
# List recent versions
npx wrangler versions list

# Roll back to a previous version
npx wrangler rollback <VERSION_ID>
```

### Database rollback

D1 does not have built-in rollback for migrations. For destructive schema changes, take an export backup before migrating:

```bash
npx wrangler d1 export service_scheduler --remote --output backup-$(date +%Y%m%d).sql
```

---

## Monitoring

View live Worker logs:

```bash
npx wrangler tail
```

This streams real-time logs from the production Worker, useful for debugging webhooks and API errors.


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*