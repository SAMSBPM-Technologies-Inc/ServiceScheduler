# Data Model

All models are defined in `backend/prisma/schema.prisma` using Prisma ORM targeting Cloudflare D1 (SQLite).

> **SQLite enum note:** D1 does not support enum types. All enum fields are stored as `String`. Valid values are documented below and enforced via Zod at the application layer.

---

## Entity Relationship Overview

```
PlatformAdmin (standalone — no relations to tenant data)

Vendor
  ├── VendorUser[]         (team members)
  ├── Product[]
  ├── ProductCategory[]
  │     └── ProductSubCategory[]
  ├── Plan[]
  │     ├── PlanScheduleTier[]     (FIXED plans)
  │     │     └── ProductGroup[]
  │     │           └── ProductGroupItem[]
  │     └── ConfigurablePlanProduct[] (CONFIGURABLE plans)
  ├── Subscription[]
  │     ├── SubscriptionSelection[]   (FIXED)
  │     ├── SubscriptionTaskSchedule[] (CONFIGURABLE)
  │     ├── Instruction[]
  │     ├── Payment[]
  │     └── Alert[]
  ├── AlertRule[]
  └── Alert[]

Customer
  ├── Subscription[]
  └── Payment[]
```

---

## Models

### Vendor

The top-level tenant. Represents a service business.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| name | String | Business display name |
| slug | String | Unique — used in portal URL `/portal/:slug` |
| email | String | Unique — owner login email |
| passwordHash | String | bcrypt hash |
| logoUrl | String? | Optional logo for customer portal |
| customDomain | String? | Unique — optional custom domain |
| stripeSecretKey | String? | AES-256-GCM encrypted, prefix `enc:` |
| stripeWebhookSecret | String? | AES-256-GCM encrypted, prefix `enc:` |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### VendorUser

Team members under a vendor. Separate from the Vendor owner account.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| name | String | |
| email | String | Unique |
| passwordHash | String | |
| role | String | `ADMIN` \| `WORKER` |
| active | Boolean | False = login blocked |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### PlatformAdmin

Platform superadmin. Completely separate from tenant data.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| name | String | |
| email | String | Unique |
| passwordHash | String | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### Customer

End users who subscribe to vendor plans.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| name | String | |
| email | String | Unique |
| passwordHash | String | |
| phone | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### Product

Items in a vendor's catalogue. Used in both Fixed and Configurable plans.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| code | String | Unique per vendor |
| name | String | |
| category | String | Matches ProductCategory.name |
| subCategory | String? | Matches ProductSubCategory.name |
| weight | String? | |
| description | String? | |
| footnote | String? | |
| alertNote | String? | Internal team note |
| price | Decimal | Default 0 — reference price |
| active | Boolean | Inactive = hidden from plans |

Unique constraint: `[vendorId, code]`

---

### ProductCategory / ProductSubCategory

Vendor-scoped category taxonomy for organising products.

**ProductCategory**

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| name | String | Unique per vendor |
| sortOrder | Int | Default 0 |

**ProductSubCategory**

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| categoryId | String | FK → ProductCategory (cascade delete) |
| name | String | Unique per category |
| sortOrder | Int | Default 0 |

Deleting a ProductCategory cascades to all its ProductSubCategories.

---

### Plan

A subscription plan. One of two types.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| name | String | |
| description | String? | |
| planType | String | `FIXED` \| `CONFIGURABLE` |
| active | Boolean | Default false — must be activated |

---

### PlanScheduleTier *(FIXED plans only)*

Each tier represents a billing frequency with a fixed price.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| planId | String | FK → Plan (cascade delete) |
| tier | String | `DAILY` \| `WEEKLY` \| `MONTHLY` |
| price | Decimal | |

Unique constraint: `[planId, tier]`

---

### ProductGroup *(FIXED plans only)*

A group of products within a tier. The selection rule controls how the customer picks.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| planScheduleTierId | String | FK → PlanScheduleTier (cascade delete) |
| name | String | |
| selectionRule | String | `ALL` \| `CHOOSE_ONE` \| `CHOOSE_N` |
| chooseN | Int? | Required when selectionRule = `CHOOSE_N` |
| sortOrder | Int | Default 0 |

---

### ProductGroupItem *(FIXED plans only)*

Individual products within a group.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| productGroupId | String | FK → ProductGroup (cascade delete) |
| productId | String | FK → Product |
| sortOrder | Int | Default 0 |

Unique constraint: `[productGroupId, productId]`

---

### ConfigurablePlanProduct *(CONFIGURABLE plans only)*

Defines which products are in a configurable plan and their pricing per frequency.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| planId | String | FK → Plan (cascade delete) |
| productId | String | FK → Product |
| allowedTiers | String | **JSON string** — array of tiers, e.g. `'["WEEKLY","MONTHLY"]'` |
| pricePerTier | String | **JSON string** — map of tier → price, e.g. `'{"WEEKLY":35,"MONTHLY":120}'` |

> **D1 quirk:** `allowedTiers` and `pricePerTier` are stored as JSON strings. Always `JSON.parse()` before use. The `parseCp()` helper in `vendor/plans.ts` handles this.

---

### Subscription

Links a customer to a plan. Central record of an active engagement.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| customerId | String | FK → Customer |
| planId | String | FK → Plan |
| vendorId | String | FK → Vendor |
| status | String | `ACTIVE` \| `PAUSED` \| `CANCELLED` |
| startDate | DateTime | |
| endDate | DateTime? | Set on cancellation |
| selectedTier | String? | `DAILY` \| `WEEKLY` \| `MONTHLY` — FIXED plans only |

---

### SubscriptionSelection *(FIXED plans)*

Stores a customer's chosen product for a product group.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| subscriptionId | String | FK → Subscription (cascade delete) |
| productGroupId | String | FK → ProductGroup |
| productId | String | The chosen product |

Unique constraint: `[subscriptionId, productGroupId, productId]`

---

### SubscriptionTaskSchedule *(CONFIGURABLE plans)*

Stores one entry per selected service for a configurable subscription.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| subscriptionId | String | FK → Subscription (cascade delete) |
| productId | String | The selected service/product |
| tier | String | `DAILY` \| `WEEKLY` \| `MONTHLY` |
| price | Decimal | Price at time of subscription (server-computed) |

Unique constraint: `[subscriptionId, productId]`

---

### Instruction

Free-text notes attached to a subscription. Upserted — one record per subscription.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| subscriptionId | String | FK → Subscription (cascade delete) |
| text | String | |

---

### Payment

One payment record per billing cycle per subscription.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| subscriptionId | String | FK → Subscription |
| customerId | String | FK → Customer |
| vendorId | String | Bare string — no Prisma relation (join via subscription.vendor) |
| amount | Decimal | |
| currency | String | Default `usd` |
| billingPeriod | String | e.g. `2026-07` |
| status | String | `PENDING` \| `PAID` \| `FAILED` \| `REFUNDED` |
| stripePaymentIntentId | String? | |
| stripeCheckoutSessionId | String? | |
| paidAt | DateTime? | |

---

### Alert

Notifications raised for the vendor's attention.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| subscriptionId | String? | Optional link to a subscription |
| productId | String? | Optional link to a product |
| type | String | `RENEWAL_REMINDER` \| `LOW_STOCK` \| `MISSED_DELIVERY` \| `CUSTOM` |
| message | String | |
| read | Boolean | Default false |

---

### AlertRule

Automation rules that trigger Alert creation.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | |
| vendorId | String | FK → Vendor |
| name | String | |
| trigger | String | `DAYS_BEFORE_RENEWAL` \| `PRODUCT_OUT_OF_STOCK` \| `MANUAL` |
| daysOffset | Int? | Used with `DAYS_BEFORE_RENEWAL` |
| productId | String? | Used with `PRODUCT_OUT_OF_STOCK` |
| message | String | Message template |
| active | Boolean | Default true |


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*