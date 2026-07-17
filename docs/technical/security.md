# Security

## Authentication

### Token Types

ServStack uses three separate JWT authentication contexts. All tokens are HMAC-SHA256 signed JWTs.

| User Type | Token key | JWT `type` claim | Signing secret |
|-----------|-----------|------------------|----------------|
| Platform Admin | `platform_token` | `platform_admin` | `JWT_VENDOR_SECRET` |
| Vendor / VendorUser | `vendor_token` | `vendor` | `JWT_VENDOR_SECRET` |
| Customer | `customer_token` | `customer` | `JWT_CUSTOMER_SECRET` |

The `type` claim is validated by middleware before any route handler runs. A valid vendor token cannot be used on a platform admin endpoint, and vice versa.

### Middleware

```
requirePlatformAdmin  — validates platform_admin JWT type
requireVendor         — validates vendor JWT type (both ADMIN and WORKER roles)
requireAdmin          — validates vendor JWT AND requires role === 'ADMIN'
requireCustomer       — validates customer JWT type
```

### Password Hashing

All passwords (vendor, vendor user, customer, platform admin) are hashed with bcrypt (default cost factor) before storage. Plaintext passwords are never stored or logged.

---

## Authorisation

### Multi-tenant Isolation

Every vendor route handler extracts `vendorId` from the JWT payload (set at login time). This ID is used in all database queries. No route trusts a `vendorId` from the request body for data access decisions.

Example: a vendor cannot view another vendor's subscriptions even if they guess the ID — the query always filters by `c.get('vendor').vendorId`.

### Role-based Access (Vendor)

- **ADMIN** — full access: create/edit products, plans, settings, Stripe keys, team management, subscription mutations
- **WORKER** — read-only: dashboard, subscriptions view, alerts view

Write endpoints use `requireAdmin` middleware. Known issue: the subscription status and selections mutation endpoints currently use `requireVendor` instead of `requireAdmin` — this allows Workers to mutate subscription state via API (UI hides these actions for Workers).

### Platform Admin Isolation

Platform admin routes use a completely separate JWT type check. Platform admins can view and modify vendor and customer data across all tenants. They access only management operations — they cannot subscribe as customers or act as a vendor.

---

## Stripe Key Encryption

Vendor Stripe keys (`stripeSecretKey`, `stripeWebhookSecret`) are encrypted at rest using **AES-256-GCM** via the Web Crypto API.

### How it works

- Encryption is controlled by the `ENCRYPTION_KEY` Worker secret (a 32-byte base64-encoded key)
- On write: `maybeEncrypt()` in `src/lib/encryption.ts` encrypts the value and prepends `enc:` to the stored string
- On read: `maybeDecrypt()` detects the `enc:` prefix and decrypts; plaintext legacy values (no prefix) are returned as-is
- If `ENCRYPTION_KEY` is not set, values are stored plaintext (backward compatible — enables zero-downtime key addition)

### Setting the encryption key

```bash
# Generate a key
openssl rand -base64 32

# Set as Worker secret
cd backend
npx wrangler secret put ENCRYPTION_KEY
# Paste the generated key when prompted
```

Once set, any newly saved Stripe keys will be encrypted. Existing plaintext keys remain readable until the vendor re-saves them.

---

## Server-Side Price Enforcement

Configurable plan subscription prices are **always computed server-side**. The client sends only `productId` and `tier` — no price value. The backend looks up the price from `ConfigurablePlanProduct.pricePerTier` in the database.

This prevents a client from manipulating subscription prices.

---

## Webhook Security

Stripe webhooks are verified using the Stripe signing secret (`stripeWebhookSecret`). The raw request body and `Stripe-Signature` header are validated using the Stripe SDK before any webhook payload is processed.

If a vendor's webhook secret is not configured, the platform's webhook secret is used as fallback only when the vendor record is found. If the vendor cannot be determined, the webhook returns `404` rather than falling back to platform keys blindly.

---

## Secrets Management

All sensitive configuration is stored as Cloudflare Worker secrets (not in `wrangler.jsonc`):

| Secret | Purpose |
|--------|---------|
| `JWT_VENDOR_SECRET` | Signs vendor and platform admin JWTs |
| `JWT_CUSTOMER_SECRET` | Signs customer JWTs |
| `ENCRYPTION_KEY` | AES-256-GCM key for Stripe key encryption |
| `STRIPE_SECRET_KEY` | Platform-level Stripe fallback key |
| `STRIPE_WEBHOOK_SECRET` | Platform-level Stripe webhook secret |

Set secrets with:
```bash
npx wrangler secret put <SECRET_NAME>
```

Never commit secrets to version control or include them in `wrangler.jsonc`.

---

## CORS

The API is configured with CORS restricted to the `FRONTEND_URL` environment variable value (`https://servstack.ca`). Cross-origin requests from other origins are rejected.

---

## Known Issues / Future Work

1. **Subscription mutation endpoints** use `requireVendor` instead of `requireAdmin` — Workers can call them via API even though the UI hides these controls
2. **`vendor_role`** is not set in localStorage on VendorUser registration (only on login) — role-based UI may not work immediately after registration for team members
3. **Existing plaintext Stripe keys** will not be automatically encrypted — vendors must re-save their keys after `ENCRYPTION_KEY` is configured


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*