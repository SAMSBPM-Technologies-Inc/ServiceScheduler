# ServiceScheduler — Scheduled Service Provider Platform

A multi-vendor SaaS platform for recurring-service businesses (meal delivery, cleaning, etc.) to sell subscription plans to customers.

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- A Stripe account (test mode keys)

### 1. Clone & Setup

```bash
git clone <repo>
cd ServiceScheduler
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy and fill in environment variables:
```bash
cp .env.example .env
```

Edit `backend/.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/service_scheduler"
JWT_VENDOR_SECRET="your-random-32-char-secret-here"
JWT_CUSTOMER_SECRET="your-random-32-char-secret-here"
JWT_EXPIRES_IN="7d"
STRIPE_SECRET_KEY="sk_test_..."      # from Stripe dashboard
STRIPE_WEBHOOK_SECRET="whsec_..."   # from Stripe webhook settings
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

Run database migrations and seed:
```bash
npx prisma migrate dev --name init
npm run db:seed
```

Start the backend dev server:
```bash
npm run dev
```
Backend runs at **http://localhost:4000**

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```
Frontend runs at **http://localhost:5173**

---

## Demo Credentials

After running `npm run db:seed`:

**Vendors (Dashboard: http://localhost:5173/vendor/login)**
| Email | Password | Portal Slug |
|---|---|---|
| vendor@freshmeals.com | password123 | fresh-meals |
| vendor@sparkleclean.com | password123 | sparkle-clean |

**Customers**
| Email | Password |
|---|---|
| alice@example.com | password123 |
| bob@example.com | password123 |

**Customer Portals:**
- Fresh Meals: http://localhost:5173/portal/fresh-meals
- SparkleClean: http://localhost:5173/portal/sparkle-clean

---

## Architecture

### Monorepo Structure
```
ServiceScheduler/
├── backend/           # Node.js + Express + TypeScript + Prisma
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/   # auth (JWT), validation (Zod)
│   │   ├── routes/
│   │   │   ├── vendor/   # auth, products, plans, subscriptions, alerts, reports
│   │   │   └── customer/ # auth, portal (public), subscriptions
│   │   └── services/     # planSelection logic, Stripe
│   └── tests/            # unit + integration tests
└── frontend/          # React + Vite + TypeScript + Tailwind CSS
    └── src/
        ├── vendor/    # Vendor Dashboard
        └── customer/  # Customer Portal
```

### Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT (separate secrets for vendors and customers)
- **Payments**: Stripe Checkout (test mode)
- **Frontend**: React 18, Vite, React Router v6, TanStack Query, Tailwind CSS, Recharts

---

## Data Model

Core tables:
- `Vendor` — multi-tenant; each vendor owns products, plans, subscriptions
- `Customer` — platform-level identity; subscriptions are vendor-scoped
- `Product` — atomic sellable item or service task
- `Plan` — `FIXED` (bundled tiers) or `CONFIGURABLE` (pick your own tasks)
- `PlanScheduleTier` → `ProductGroup` → `ProductGroupItem` — fixed plan structure
- `ConfigurablePlanProduct` — eligible tasks + allowed tiers for configurable plans
- `Subscription` — customer's plan instance; holds `selectedTier` or `taskSchedules`
- `SubscriptionSelection` — customer's CHOOSE_ONE/CHOOSE_N choices
- `SubscriptionTaskSchedule` — per-task schedule in configurable subscriptions
- `Instruction` — free-text delivery notes on a subscription
- `Payment` — billing records with Stripe integration
- `Alert` / `AlertRule` — notification system

---

## API Reference

All endpoints under `/api`. Auth via `Authorization: Bearer <token>`.

### Vendor Auth
```
POST /api/vendor/auth/register  { name, email, password, slug }
POST /api/vendor/auth/login     { email, password }
GET  /api/vendor/auth/me
```

### Vendor — Products
```
GET    /api/vendor/products        ?search=&category=&active=
POST   /api/vendor/products
PUT    /api/vendor/products/:id
DELETE /api/vendor/products/:id    (archives)
```

### Vendor — Plans
```
GET   /api/vendor/plans
POST  /api/vendor/plans            { planType: FIXED|CONFIGURABLE, name, ... }
GET   /api/vendor/plans/:id
PATCH /api/vendor/plans/:id/activate
```

### Vendor — Reports
```
GET /api/vendor/reports/dashboard
GET /api/vendor/reports/revenue    ?period=7d|30d|90d
GET /api/vendor/reports/export/subscriptions   (CSV download)
```

### Customer Auth
```
POST /api/customer/auth/register  { name, email, password, phone? }
POST /api/customer/auth/login     { email, password }
GET  /api/customer/auth/me
```

### Customer Portal (public)
```
GET /api/portal/vendor/:slug           vendor info
GET /api/portal/vendor/:slug/plans     active plans with full structure
```

### Customer Subscriptions
```
GET  /api/customer/subscriptions
POST /api/customer/subscriptions/fixed         subscribe to FIXED plan
POST /api/customer/subscriptions/configurable  subscribe to CONFIGURABLE plan
GET  /api/customer/subscriptions/:id
PATCH /api/customer/subscriptions/:id/status   { status: ACTIVE|PAUSED|CANCELLED }
PUT  /api/customer/subscriptions/:id/instructions { text }
```

### Payments
```
POST /api/payments/checkout    { paymentId, successUrl, cancelUrl }  → { url }
POST /api/payments/webhook     (Stripe webhook)
GET  /api/payments/history
```

---

## Running Tests

```bash
cd backend
npm test
```

Tests cover:
- `planSelection.test.ts` — unit tests for ALL/CHOOSE_ONE/CHOOSE_N selection rules and configurable plan validation (no DB)
- `multitenancy.test.ts` — integration tests verifying vendor data isolation (requires DATABASE_URL)

Run unit tests only (no DB needed):
```bash
npx jest tests/planSelection.test.ts
```

---

## Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Get test keys from **Developers → API keys**
3. For webhooks (local testing), install the Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:4000/api/payments/webhook
   ```
   This prints a webhook signing secret (`whsec_...`) — put it in `STRIPE_WEBHOOK_SECRET`.
4. When a customer clicks "Pay Now", they are redirected to Stripe Checkout. On success, the webhook fires and marks the payment as `PAID`.

---

## Assumptions & Open Items (flagged for client)

1. **Recurring billing**: v1 implements **manual pay-per-period** — a `PENDING` payment is created at subscription time and the customer pays via Stripe Checkout. Full automatic recurring billing (Stripe Subscriptions with `price` objects + automatic charges) is a planned fast-follow.

2. **Vendor staff sub-accounts**: v1 supports **single login per vendor**. Multi-staff roles (owner/staff) are not in scope for v1.

3. **Skip individual occurrences**: Customers cannot pause/skip individual delivery dates (e.g., skip one Tuesday's meal). This feature is flagged as a likely fast-follow.

4. **Schedule calendar**: The "schedule view" shows the subscription tier/task list. A full calendar rendering future delivery/service dates is a fast-follow (needs a scheduling engine).

5. **Email notifications**: Alert rules trigger in-app notification logs. Outbound email (SMTP/SendGrid) is stubbed — implement by wiring the alert creation to an email service.

---

## Development Notes

### Resetting the database
```bash
cd backend
npm run db:reset    # drops + recreates schema + re-seeds
```

### Generating Prisma types after schema change
```bash
npx prisma generate
```

### Useful Prisma Studio (visual DB browser)
```bash
npx prisma studio
```
