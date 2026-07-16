# Build Prompt: Scheduled Service Provider Platform

---

## Role & Goal

You are a senior full-stack engineer. Build a **multi-vendor Scheduled Service Provider platform** — a SaaS application where independent service/product vendors (meal services, cleaning services, and similar recurring-service businesses) can list their offerings, bundle them into subscription plans with flexible schedules, and sell them to customers through a branded portal. Each vendor manages their business from a shared **Vendor Dashboard**; each vendor also gets an isolated **Customer Portal** where their customers browse, subscribe, and pay.

Build this as a working, runnable application (not a mockup) — real database, real auth, real APIs, seed data, and a functional UI for both portals.

---

## Actors

1. **Vendor** — a business (e.g., "Fresh Meals Co.", "SparkleClean") that sells scheduled products/services. Logs into the Vendor Dashboard. Multiple vendors coexist on the platform (multi-tenant).
2. **Customer** — an end user who subscribes to one vendor's plans via that vendor's customer-facing portal.
3. **Platform Admin** (implicit, build a minimal version) — can view all vendors, for future support/ops use. Not the focus of this build, but don't block vendor data behind a schema that assumes single-tenant.

---

## Core Domain Concepts (read carefully — this is the hard part)

The two examples the client gave both reduce to the same underlying model, but the model must support both a **fixed bundle** style (meal plans) and a **pick-your-own-schedule** style (cleaning tasks):

### Example A — Meal Service (fixed plan with product groups & alternatives)
A vendor defines Plans (e.g., "Plan 1 - Veg", "Plan 2 - Veg", "Plan 3 - Non-Veg"). Each plan supports one or more **schedule tiers** (Daily, Weekly, Monthly), and each tier includes a specific bundle of products. Critically, some products are interchangeable — a customer must pick exactly one from a group of alternatives (e.g., "Product 2a OR Product 2b, choose 1", while "Product 1" and "Product 2" are always both included).

### Example B — Cleaning Service (configurable tasks, independent schedules)
A vendor defines a plan made of selectable **task types** (floor cleaning, lawn maintenance, garage cleaning, basement cleaning, toilets, vacuuming). The customer picks which tasks they want AND sets an independent schedule per task (e.g., vacuum = Daily, toilets = Weekly, garage = Monthly) — there is no fixed matrix; scheduling happens at the task level, not the plan level.

**Your data model must generalize both patterns.** Recommended approach:

- `Product` — the atomic sellable/serviceable item (a meal item, or a cleaning task type).
- `Plan` — a named offering by a vendor, with a `plan_type` of `fixed` or `configurable`.
  - **Fixed plans**: define one or more `ScheduleTier` entries (Daily/Weekly/Monthly). Each tier has one or more `ProductGroup`s. A `ProductGroup` has a `selection_rule` of `all` (all items in the group are included) or `choose_one` / `choose_n` (customer picks from alternatives within that group). `ProductGroupItem` links a group to the eligible products (the "2a or 2b" alternatives).
  - **Configurable plans**: define a list of eligible `Product`s (tasks) with, per product, which schedule tiers are allowed. The customer builds their own subscription by picking products AND a schedule per product.
- `Subscription` — a customer's instance of a plan: references the plan, the customer, start date, status (active/paused/cancelled), and:
  - for fixed plans: which schedule tier was chosen, plus the resolved selection for each `choose_one`/`choose_n` group (`SubscriptionSelection`).
  - for configurable plans: a list of `SubscriptionTaskSchedule` rows (product + chosen schedule tier).
- `Instruction` — free-text delivery/service instructions attached to a subscription (e.g., "leave at back door", "use eco-friendly detergent").
- `Alert` / `Reminder` — vendor-defined or system-generated notifications (e.g., "renewal due", "low stock", "missed delivery"), scoped to a vendor, and optionally to a subscription or product.
- `Payment` — records against a subscription: amount, billing period, status, gateway reference.
- Reporting is derived from the above — do not create a separate "report" table; build queries/views.

Make schedule tiers and product categories/sub-categories driven by vendor-managed reference data where reasonable, not hardcoded enums, so a vendor can define new categories without a code change (except the Daily/Weekly/Monthly tier set, which can be a fixed enum).

---

## Vendor Dashboard — Required Features

1. **Authentication** — vendor signup/login, session-based auth, one vendor account can have multiple staff logins (basic role: owner/staff) if time allows; otherwise single login per vendor is acceptable for v1.
2. **Product management** — create/update/archive a product with: name, code (unique per vendor), category, sub-category, weight/unit, description, footnote, alert note, price, active flag. List/search/filter products by category.
3. **Plan builder** — create a plan, choose `fixed` or `configurable` type, and:
   - For `fixed`: define schedule tiers offered, and for each tier build product groups (all-required or choose-one-of-N), attaching eligible products per group.
   - For `configurable`: select eligible products (tasks) and which schedule tiers apply to each.
   - Set plan pricing (flat, per-tier, or per-product — support at least per-tier pricing).
   - Activate/deactivate a plan.
4. **Alerts & reminders** — vendor can create alert rules (e.g., "notify customer 3 days before renewal", "notify vendor when product X marked out of stock") and view a log of triggered alerts. A simple rule engine + notification log is sufficient; don't over-engineer real-time push for v1 — in-app notification center + email hook (stubbed) is enough.
5. **Reporting** — dashboard with at minimum: active subscriptions count, revenue by period, most-subscribed plans/products, upcoming renewals, churn (cancellations) over time. Export to CSV.
6. **Customer/subscription visibility** — vendor can view their customers' active subscriptions, schedules, and instructions (read access, not edit) to fulfill orders.

---

## Customer Portal — Required Features

Each vendor gets their own branded (at least by name/logo) customer-facing portal instance.

1. **Login/Registration** — customer signs up and logs in. A customer's account should be able to hold subscriptions across multiple vendors (customer identity is platform-level; subscriptions are vendor-scoped).
2. **Browse & subscribe** — view a vendor's active plans, see schedule tier options and pricing, make required alternative selections (choose-one groups) or build a configurable plan (pick tasks + per-task schedule), then subscribe.
3. **Instructions** — add/edit free-text instructions per subscription.
4. **View subscriptions & schedule** — see all active/past subscriptions, their resolved product/task list, and upcoming schedule (calendar or list view of what's delivered/serviced when).
5. **Reporting** — customer-facing history: past deliveries/services, payment history, upcoming charges.
6. **Pay** — integrate **Stripe** (test/sandbox mode) for subscription billing. Support at minimum: initial payment on subscribe, and recurring billing per the schedule tier (or manual "pay now" for the current period if full recurring billing automation is out of scope for v1 — state clearly which you implemented). Store payment status and history.

---

## Recommended Tech Stack

- **Frontend**: React (Vite), React Router, a component library (e.g., shadcn/ui or MUI) for speed, Tailwind CSS.
- **Backend**: Node.js + Express (or Fastify), REST API (JSON). Use TypeScript throughout (frontend and backend) for maintainability.
- **Database**: PostgreSQL. Use an ORM (Prisma recommended) to keep the schema in version-controlled migrations.
- **Auth**: JWT-based sessions or a library like Passport/Auth.js; separate auth contexts for Vendor users and Customer users (they are different principal types even if stored in related tables).
- **Payments**: Stripe (test mode), using Stripe Checkout or Payment Intents + webhooks for payment status updates.
- **Monorepo layout**: `/backend`, `/frontend`, shared `/packages/types` for shared TypeScript types (Product, Plan, Subscription, etc.) if using a monorepo tool (Turborepo/Nx) — otherwise two clean top-level folders is fine.

---

## Non-Functional Requirements

- Multi-tenancy: every vendor-scoped table must carry `vendor_id`; enforce it at the query layer (no cross-vendor data leakage) — write at least one automated test proving vendor A cannot read vendor B's products/plans/subscriptions.
- Input validation on all write endpoints (e.g., Zod on the backend).
- Seed script that creates 2 demo vendors (one meal service configured like Example A, one cleaning service configured like Example B), demo products/plans, and a couple of demo customers with active subscriptions — so the app is demoable immediately after setup.
- Basic automated tests: unit tests for the plan-selection resolution logic (choose-one validation, configurable task/schedule validation) and payment status transitions, since this is the riskiest business logic.
- README with setup instructions (env vars, migrations, seed, run dev servers, Stripe test keys needed).

---

## Suggested Build Order (phases)

1. Data model + migrations + seed script (both example vendor types seeded).
2. Backend API: auth (vendor + customer), products, plans (both types), plan-selection validation logic.
3. Backend API: subscriptions, instructions, payments (Stripe test mode), alerts, reporting endpoints.
4. Frontend: Vendor Dashboard (product mgmt, plan builder, alerts, reports).
5. Frontend: Customer Portal (browse/subscribe flow handling both plan types, instructions, subscriptions view, payment, reporting).
6. Seed data polish + README + smoke test both example scenarios end-to-end (subscribe to a meal plan with a choose-one group; subscribe to a cleaning plan with custom per-task schedules).

---

## Acceptance Criteria (definition of done)

- A vendor can register, create products, and build both a fixed plan (with a choose-one group) and a configurable plan.
- A customer can register, subscribe to each plan type, correctly resolving alternatives/choices, add instructions, view their schedule, make a test payment via Stripe, and see it reflected in payment history.
- Vendor reporting shows the new subscription and revenue.
- Cross-vendor data isolation test passes.
- App runs locally from a clean clone following the README (migrations + seed + `dev` scripts).

---

## Open Items / Assumptions to Flag Back to the Client

State these explicitly in your PR/README rather than silently deciding:
- Whether recurring billing should be fully automated (auto-charge each period) or "pay now per period" — v1 assumption: manual/semi-automated pay-per-period is acceptable, full recurring automation is a fast-follow.
- Whether vendors need staff sub-accounts/roles in v1 (assumption: single login per vendor for now).
- Whether customers can pause/skip individual scheduled occurrences (e.g., skip Tuesday's meal) — not in the requirements as given; flag as a likely fast-follow rather than building speculatively.
