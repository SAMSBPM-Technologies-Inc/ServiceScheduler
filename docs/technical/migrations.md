# Database Migrations

ServStack uses Prisma migrations applied via Wrangler to Cloudflare D1.

---

## Migration History

| Migration | Description |
|-----------|-------------|
| `20260715161006_init` | Base schema — all core models |
| `20260716000000_custom_domain_and_selection_fix` | `customDomain` on Vendor; `SubscriptionSelection` unique constraint fix |
| `20260716100000_vendor_users_and_stripe_keys` | `VendorUser` table; `stripeSecretKey` and `stripeWebhookSecret` on Vendor |
| `20260717000000_product_categories` | `ProductCategory` and `ProductSubCategory` tables |
| `20260717020000_platform_admin` | `PlatformAdmin` table |

---

## Creating a New Migration

### 1. Edit the Prisma schema

Make your changes to `backend/prisma/schema.prisma`.

### 2. Generate the migration SQL

```bash
cd backend
npx prisma migrate diff \
  --from-local-d1 \
  --to-schema-datamodel prisma/schema.prisma \
  --script \
  --output prisma/migrations/<timestamp>_<name>/migration.sql
```

Replace `<timestamp>` with the current UTC datetime (format: `YYYYMMDDHHMMSS`) and `<name>` with a short snake_case description.

Alternatively, create the migration directory and SQL file manually.

### 3. Apply locally (for testing)

```bash
npx wrangler d1 migrations apply service_scheduler --local
```

### 4. Apply to remote D1

```bash
npx wrangler d1 migrations apply service_scheduler --remote
```

---

## Applying Migrations Without Prisma Diff

If you are making a simple additive change (new table, new column with default), you can write the SQL directly:

**Example — adding a new column:**

`prisma/migrations/20260718000000_add_phone_to_vendor/migration.sql`:
```sql
ALTER TABLE "Vendor" ADD COLUMN "phone" TEXT;
```

Then apply with wrangler as above.

---

## D1 Migration State

Wrangler tracks applied migrations in the `d1_migrations` table in your D1 database. Each migration is applied exactly once — re-running `migrations apply` skips already-applied migrations.

To check which migrations have been applied:
```bash
npx wrangler d1 execute service_scheduler --remote --command "SELECT * FROM d1_migrations ORDER BY applied_at;"
```

---

## SQLite Constraints

D1 is SQLite. Keep these limitations in mind when writing migrations:

- **No `ALTER COLUMN`** — SQLite does not support modifying column types or constraints. Workaround: create a new table, copy data, drop old table, rename new table.
- **No native enums** — Use `TEXT` columns. Valid values are enforced at the application layer.
- **No `DROP COLUMN` before SQLite 3.35** — D1's SQLite version supports it, but test locally first.
- **Foreign key enforcement** — SQLite requires `PRAGMA foreign_keys = ON` per connection. D1 handles this — Prisma's adapter enables it.

---

## Generating Prisma Client After Schema Changes

After modifying the schema, regenerate the Prisma client:

```bash
cd backend
npx prisma generate
```

This updates the TypeScript types in `node_modules/.prisma/client`. Run this before building or deploying.

---

## Backup Before Destructive Migrations

Before running migrations that drop tables or columns on remote:

```bash
npx wrangler d1 export service_scheduler --remote --output backup-$(date +%Y%m%d).sql
```


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*