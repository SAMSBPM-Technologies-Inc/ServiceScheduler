---
name: ServiceScheduler Project
description: Multi-vendor scheduled service platform — architecture, stack, seeded data, open items
type: project
---

Full-stack SaaS platform built July 2026. Working, runnable app — not a mockup.

**Why:** Client needed a platform for meal delivery + cleaning services (two different plan models) with multi-tenancy.

## Stack
- Backend: Node.js + Express + TypeScript + Prisma + PostgreSQL, port 4000
- Frontend: React + Vite + TypeScript + Tailwind CSS + TanStack Query, port 5173
- Auth: JWT, separate secrets for vendors vs customers
- Payments: Stripe Checkout (test mode), manual pay-per-period for v1

## Seeded demo data
- vendor@freshmeals.com / password123 → slug: fresh-meals → FIXED plan "Veg Meal Plan"
- vendor@sparkleclean.com / password123 → slug: sparkle-clean → CONFIGURABLE plan "Home Clean Plan"
- alice@example.com / password123 → subscribed to Veg Meal Plan (DAILY, Paneer Curry)
- bob@example.com / password123 → subscribed to SparkleClean (vacuum=DAILY, toilet=WEEKLY, garage=MONTHLY)

## Key domain model
- Plan has `planType: FIXED | CONFIGURABLE`
- FIXED: PlanScheduleTier → ProductGroup (ALL/CHOOSE_ONE/CHOOSE_N) → ProductGroupItem
- CONFIGURABLE: ConfigurablePlanProduct with allowedTiers[] + pricePerTier JSON
- Subscription holds selectedTier (fixed) or SubscriptionTaskSchedule rows (configurable)
- All vendor-scoped tables have vendorId; enforced at query layer

## Open items (flagged)
- Recurring billing: v1 is manual pay-per-period; full auto-billing is fast-follow
- Staff sub-accounts: single login per vendor for v1
- Skip individual occurrences: not built, flagged as fast-follow
- Email notifications: stub only, no outbound email wired up

**How to apply:** When extending this project, maintain the vendorId isolation pattern on all new vendor-scoped tables. The plan selection validation logic lives in `backend/src/services/planSelection.ts`.
