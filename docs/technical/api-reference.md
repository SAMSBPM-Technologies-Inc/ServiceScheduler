# API Reference

Base URL: `https://api.servstack.ca`

All request and response bodies are JSON. Authenticated endpoints require a `Authorization: Bearer <token>` header.

---

## Authentication Overview

| Endpoint group | Token type | Header value |
|---------------|-----------|--------------|
| `/api/vendor/*` | Vendor JWT | `Bearer <vendor_token>` |
| `/api/customer/*` | Customer JWT | `Bearer <customer_token>` |
| `/api/platform/*` | Platform Admin JWT | `Bearer <platform_token>` |
| `/api/payments/checkout` | Customer JWT | `Bearer <customer_token>` |
| `/api/payments/webhook/:vendorId` | None (Stripe signature) | — |

---

## Vendor Auth

### POST /api/vendor/auth/register

Register a new vendor account.

**Body:**
```json
{
  "name": "FreshMeals",
  "email": "owner@freshmeals.com",
  "password": "password123",
  "slug": "freshmeals"
}
```

**Response `201`:**
```json
{
  "token": "<jwt>",
  "vendor": { "id": "...", "name": "FreshMeals", "email": "...", "slug": "freshmeals" },
  "role": "ADMIN"
}
```

**Errors:** `400` validation, `409` email/slug already in use

---

### POST /api/vendor/auth/login

Login as vendor owner or team member (VendorUser).

**Body:**
```json
{ "email": "owner@freshmeals.com", "password": "password123" }
```

**Response `200`:**
```json
{
  "token": "<jwt>",
  "vendor": { "id": "...", "name": "...", "email": "...", "slug": "...", "logoUrl": null },
  "role": "ADMIN"
}
```

Role is `ADMIN` for vendor owners, `ADMIN` or `WORKER` for team members.

**Errors:** `401` invalid credentials, `401` account inactive

---

### GET /api/vendor/auth/me

Get the authenticated vendor's profile.

**Auth:** Vendor token

**Response `200`:**
```json
{
  "vendor": { "id": "...", "name": "...", "email": "...", "slug": "...", "logoUrl": null, "customDomain": null, "createdAt": "..." },
  "role": "ADMIN"
}
```

---

### PUT /api/vendor/auth/domain

Set or clear the vendor's custom domain. **Admin only.**

**Body:**
```json
{ "customDomain": "subscribe.freshmeals.com" }
```

Pass `null` to clear.

**Response `200`:** `{ "ok": true }`

**Errors:** `409` domain in use by another vendor

---

### GET /api/vendor/auth/stripe

Check whether Stripe keys are configured (does not return the actual keys).

**Auth:** Vendor token

**Response `200`:**
```json
{ "hasStripeKey": true, "hasWebhookSecret": false }
```

---

### PUT /api/vendor/auth/stripe

Save Stripe keys. **Admin only.** Keys are encrypted at rest.

**Body:**
```json
{ "stripeSecretKey": "sk_live_...", "stripeWebhookSecret": "whsec_..." }
```

**Response `200`:** `{ "ok": true }`

---

## Vendor Products

All endpoints require a vendor token. Write operations require Admin role.

### GET /api/vendor/products

List all products for the vendor.

**Query params:**
- `category` — filter by category name
- `active` — `true` or `false`
- `search` — search by name or code

**Response `200`:**
```json
{ "products": [{ "id": "...", "code": "CHK-001", "name": "Chicken Breast", "category": "Proteins", "subCategory": "White Meat", "price": "9.99", "active": true, ... }] }
```

---

### POST /api/vendor/products

Create a product. **Admin only.**

**Body:**
```json
{
  "code": "CHK-001",
  "name": "Chicken Breast",
  "category": "Proteins",
  "subCategory": "White Meat",
  "weight": "500g",
  "description": "Free-range chicken breast",
  "footnote": "May contain traces of nuts",
  "alertNote": "Check stock before packing",
  "price": 9.99,
  "active": true
}
```

**Response `201`:** `{ "product": { ... } }`

**Errors:** `409` product code already exists

---

### GET /api/vendor/products/:id

Get a single product.

**Response `200`:** `{ "product": { ... } }` | `404`

---

### PUT /api/vendor/products/:id

Update a product. All fields optional (partial update). **Admin only.**

**Response `200`:** `{ "product": { ... } }`

---

### DELETE /api/vendor/products/:id

Deactivate (archive) a product. **Admin only.** Does not hard-delete.

**Response `200`:** `{ "message": "Product archived" }`

---

## Vendor Categories

All endpoints require a vendor token. Write operations require Admin role.

### GET /api/vendor/categories

List all categories with sub-categories.

**Response `200`:**
```json
{
  "categories": [
    {
      "id": "...", "name": "Proteins", "sortOrder": 0,
      "subCategories": [{ "id": "...", "name": "White Meat", "sortOrder": 0 }]
    }
  ]
}
```

---

### POST /api/vendor/categories

Create a category. **Admin only.**

**Body:** `{ "name": "Proteins" }`

**Response `201`:** `{ "category": { "id": "...", "name": "Proteins", "subCategories": [] } }`

**Errors:** `409` category name already exists

---

### PUT /api/vendor/categories/:id

Rename a category. **Admin only.**

**Body:** `{ "name": "New Name" }`

**Response `200`:** `{ "category": { ... } }`

---

### DELETE /api/vendor/categories/:id

Delete a category and all its sub-categories. **Admin only.**

**Response `200`:** `{ "ok": true }`

---

### POST /api/vendor/categories/:id/subcategories

Add a sub-category. **Admin only.**

**Body:** `{ "name": "White Meat" }`

**Response `201`:** `{ "subCategory": { "id": "...", "name": "White Meat" } }`

---

### PUT /api/vendor/categories/:id/subcategories/:subId

Rename a sub-category. **Admin only.**

**Body:** `{ "name": "New Name" }`

**Response `200`:** `{ "subCategory": { ... } }`

---

### DELETE /api/vendor/categories/:id/subcategories/:subId

Delete a sub-category. **Admin only.**

**Response `200`:** `{ "ok": true }`

---

## Vendor Plans

All endpoints require a vendor token. Write operations require Admin role.

### GET /api/vendor/plans

List all plans with full structure.

**Response `200`:**
```json
{
  "plans": [{
    "id": "...", "name": "Weekly Meal Box", "planType": "FIXED", "active": true,
    "_count": { "subscriptions": 12 },
    "scheduleTiers": [{ "tier": "WEEKLY", "price": "49.00", "productGroups": [...] }],
    "configurableProducts": []
  }]
}
```

---

### POST /api/vendor/plans

Create a plan. **Admin only.**

**Fixed plan body:**
```json
{
  "planType": "FIXED",
  "name": "Weekly Meal Box",
  "description": "Fresh ingredients weekly",
  "scheduleTiers": [{
    "tier": "WEEKLY",
    "price": 49,
    "productGroups": [{
      "name": "Protein",
      "selectionRule": "CHOOSE_ONE",
      "chooseN": null,
      "sortOrder": 0,
      "items": [{ "productId": "prod_abc", "sortOrder": 0 }]
    }]
  }]
}
```

**Configurable plan body:**
```json
{
  "planType": "CONFIGURABLE",
  "name": "Custom Lawn Care",
  "configurableProducts": [{
    "productId": "prod_xyz",
    "allowedTiers": ["WEEKLY", "MONTHLY"],
    "pricePerTier": { "WEEKLY": 35, "MONTHLY": 120 }
  }]
}
```

**Response `201`:** `{ "plan": { ... } }` with full plan structure

---

### GET /api/vendor/plans/:id

Get a single plan with full structure.

**Response `200`:** `{ "plan": { ... } }` | `404`

---

### PUT /api/vendor/plans/:id

Replace a plan's structure. Same body format as POST. **Admin only.** The `planType` cannot be changed.

**Response `200`:** `{ "plan": { ... } }`

---

### PATCH /api/vendor/plans/:id/activate

Toggle the plan active/inactive. **Admin only.**

**Response `200`:** `{ "plan": { "active": true, ... } }`

---

### DELETE /api/vendor/plans/:id

Deactivate a plan. **Admin only.** Does not hard-delete.

**Response `200`:** `{ "message": "Plan deactivated" }`

---

## Vendor Subscriptions

All endpoints require a vendor token (both ADMIN and WORKER). Note: write operations currently use `requireVendor` not `requireAdmin`.

### GET /api/vendor/subscriptions

List subscriptions for the vendor.

**Query params:**
- `status` — `ACTIVE` | `PAUSED` | `CANCELLED`
- `planId` — filter by plan

**Response `200`:**
```json
{
  "subscriptions": [{
    "id": "...", "status": "ACTIVE", "selectedTier": "WEEKLY",
    "customer": { "id": "...", "name": "Jane Smith", "email": "jane@example.com" },
    "plan": { "id": "...", "name": "Weekly Meal Box", "planType": "FIXED" },
    "selections": [...],
    "taskSchedules": [...],
    "instructions": [...],
    "payments": [...]
  }]
}
```

---

### GET /api/vendor/subscriptions/:id

Get full detail for one subscription including plan structure, customer, payments.

**Response `200`:** `{ "subscription": { ... } }` | `404`

---

### PATCH /api/vendor/subscriptions/:id/status

Change subscription status.

**Body:** `{ "status": "PAUSED" }`

Valid values: `ACTIVE`, `PAUSED`, `CANCELLED`. Setting `CANCELLED` also sets `endDate`.

**Response `200`:** `{ "subscription": { ... } }`

---

### PUT /api/vendor/subscriptions/:id/selections

Replace all product selections for a Fixed plan subscription.

**Body:**
```json
{
  "selections": [
    { "productGroupId": "grp_abc", "productId": "prod_xyz" }
  ]
}
```

**Response `200`:** `{ "ok": true }`

---

### PUT /api/vendor/subscriptions/:id/schedules

Replace all task schedules for a Configurable plan subscription.

**Body:**
```json
{
  "taskSchedules": [
    { "productId": "prod_abc", "tier": "WEEKLY", "price": 35 }
  ]
}
```

**Response `200`:** `{ "ok": true }`

---

## Customer Auth

### POST /api/customer/auth/register

Register a new customer account.

**Body:**
```json
{ "name": "Jane Smith", "email": "jane@example.com", "password": "password123", "phone": "+1234567890" }
```

**Response `201`:**
```json
{ "token": "<jwt>", "customer": { "id": "...", "name": "Jane Smith", "email": "jane@example.com" } }
```

**Errors:** `400` validation, `409` email in use

---

### POST /api/customer/auth/login

**Body:** `{ "email": "jane@example.com", "password": "password123" }`

**Response `200`:**
```json
{ "token": "<jwt>", "customer": { "id": "...", "name": "Jane Smith", "email": "...", "phone": null } }
```

**Errors:** `401` invalid credentials

---

### GET /api/customer/auth/me

**Auth:** Customer token

**Response `200`:** `{ "customer": { "id": "...", "name": "...", "email": "...", "phone": null, "createdAt": "..." } }`

---

## Customer Portal (Public)

These endpoints require no authentication.

### GET /api/customer/portal/by-domain?domain=subscribe.freshmeals.com

Resolve a custom domain to a vendor. Used by the frontend on custom-domain portals.

**Response `200`:** `{ "vendor": { "id": "...", "name": "FreshMeals", "slug": "freshmeals", "logoUrl": null } }` | `404`

---

### GET /api/customer/portal/vendor/:slug

Get vendor info by slug.

**Response `200`:** `{ "vendor": { "id": "...", "name": "FreshMeals", "slug": "freshmeals", "logoUrl": null } }` | `404`

---

### GET /api/customer/portal/vendor/:slug/plans

List all active plans for a vendor with full plan structure.

**Response `200`:**
```json
{
  "plans": [{
    "id": "...", "name": "Weekly Meal Box", "planType": "FIXED", "active": true,
    "scheduleTiers": [{ "tier": "WEEKLY", "price": "49.00", "productGroups": [...] }],
    "configurableProducts": []
  }]
}
```

---

## Customer Subscriptions

All endpoints require a customer token.

### GET /api/customer/subscriptions

List the authenticated customer's subscriptions.

**Response `200`:** `{ "subscriptions": [...] }`

---

### POST /api/customer/subscriptions/fixed

Subscribe to a Fixed plan.

**Body:**
```json
{
  "planId": "plan_abc",
  "selectedTier": "WEEKLY",
  "selections": [
    { "productGroupId": "grp_123", "productId": "prod_456" }
  ]
}
```

Selections are validated server-side against the plan's selection rules. Price comes from the plan tier — not accepted from the client.

**Response `201`:** `{ "subscription": { "id": "...", "status": "ACTIVE", ... } }`

**Errors:** `400` invalid selections, `404` plan not found or inactive

---

### POST /api/customer/subscriptions/configurable

Subscribe to a Configurable plan.

**Body:**
```json
{
  "planId": "plan_xyz",
  "taskSchedules": [
    { "productId": "prod_abc", "tier": "WEEKLY" },
    { "productId": "prod_def", "tier": "MONTHLY" }
  ]
}
```

Prices are computed server-side from the plan's `pricePerTier` data. Do not send prices.

**Response `201`:** `{ "subscription": { ... } }`

---

### GET /api/customer/subscriptions/:id

Get full detail for one subscription.

**Response `200`:** `{ "subscription": { ... } }` | `404`

---

### PATCH /api/customer/subscriptions/:id/status

Change own subscription status.

**Body:** `{ "status": "PAUSED" }` — `ACTIVE` | `PAUSED` | `CANCELLED`

**Response `200`:** `{ "subscription": { ... } }`

---

### PUT /api/customer/subscriptions/:id/instructions

Set delivery instructions (upsert — replaces existing).

**Body:** `{ "text": "Leave at side gate" }`

**Response `200`:** `{ "instruction": { "id": "...", "text": "..." } }`

---

## Payments

### POST /api/payments/checkout

Create a Stripe Checkout session for a pending payment. **Customer auth required.**

**Body:**
```json
{
  "paymentId": "pay_abc",
  "successUrl": "https://servstack.ca/portal/freshmeals/success",
  "cancelUrl": "https://servstack.ca/portal/freshmeals/cancel"
}
```

**Response `200`:** `{ "url": "https://checkout.stripe.com/..." }`

Redirects the customer to Stripe. On success, Stripe calls the webhook.

**Errors:** `404` payment not found or not PENDING

---

### POST /api/payments/webhook/:vendorId

Stripe webhook endpoint. Called by Stripe — not by the frontend.

The `vendorId` URL parameter tells the system which vendor's Stripe keys to use for signature verification.

Handles `checkout.session.completed` → marks payment as `PAID`.

**Headers:** `Stripe-Signature` required

---

## Platform Admin Auth

### POST /api/platform/auth/register

Bootstrap the first platform admin account. Returns `409` if any admin already exists.

**Body:**
```json
{ "name": "Platform Admin", "email": "admin@servstack.ca", "password": "strong-password" }
```

**Response `201`:** `{ "token": "<jwt>", "admin": { "id": "...", "name": "...", "email": "..." } }`

---

### POST /api/platform/auth/login

**Body:** `{ "email": "admin@servstack.ca", "password": "strong-password" }`

**Response `200`:** `{ "token": "<jwt>", "admin": { "id": "...", "name": "...", "email": "..." } }`

---

### GET /api/platform/auth/me

**Auth:** Platform admin token

**Response `200`:** `{ "admin": { "id": "...", "name": "...", "email": "...", "createdAt": "..." } }`

---

## Platform Admin — Vendors

All endpoints require platform admin token.

### GET /api/platform/vendors

List all vendors with summary stats.

**Response `200`:**
```json
{
  "vendors": [{
    "id": "...", "name": "FreshMeals", "email": "...", "slug": "freshmeals",
    "customDomain": null, "createdAt": "...",
    "_count": { "subscriptions": 42, "plans": 3, "vendorUsers": 2 }
  }]
}
```

---

### GET /api/platform/vendors/:id

Get vendor detail with plans, team, and recent subscriptions.

**Response `200`:**
```json
{
  "vendor": {
    "id": "...", "name": "...", "email": "...", "slug": "...",
    "hasStripeKey": true,
    "plans": [{ "id": "...", "name": "...", "planType": "FIXED", "active": true, "_count": { "subscriptions": 12 } }],
    "vendorUsers": [{ "id": "...", "name": "...", "email": "...", "role": "ADMIN", "active": true }],
    "subscriptions": [{ "id": "...", "status": "ACTIVE", "customer": { "name": "Jane" }, "plan": { "name": "Meal Box" } }],
    "_count": { "subscriptions": 42, "plans": 3, "vendorUsers": 2 }
  }
}
```

Note: `stripeSecretKey` is never returned — only `hasStripeKey` boolean.

---

### PATCH /api/platform/vendors/:id

Update vendor name, slug, or custom domain.

**Body:**
```json
{ "name": "New Name", "slug": "new-slug", "customDomain": null }
```

All fields optional.

**Response `200`:** `{ "vendor": { "id": "...", "name": "...", "slug": "...", ... } }`

---

### POST /api/platform/vendors/:id/reset-password

Reset the vendor owner's password.

**Body:** `{ "newPassword": "newpassword123" }`

Minimum 8 characters.

**Response `200`:** `{ "ok": true }`

---

### POST /api/platform/vendors/:id/users/:userId/reset-password

Reset a team member's password.

**Body:** `{ "newPassword": "newpassword123" }`

**Response `200`:** `{ "ok": true }`

---

### PATCH /api/platform/vendors/:id/users/:userId

Toggle team member active status or change role.

**Body:**
```json
{ "active": false }
```
or
```json
{ "role": "WORKER" }
```

**Response `200`:** `{ "user": { "id": "...", "name": "...", "email": "...", "role": "WORKER", "active": false } }`

---

## Platform Admin — Customers

All endpoints require platform admin token.

### GET /api/platform/customers

List all customers (max 100).

**Query params:**
- `search` — search by name or email
- `vendorId` — filter to customers with a subscription for this vendor

**Response `200`:**
```json
{
  "customers": [{
    "id": "...", "name": "Jane Smith", "email": "...", "phone": null, "createdAt": "...",
    "_count": { "subscriptions": 2 }
  }]
}
```

---

### GET /api/platform/customers/:id

Get customer detail with subscriptions and payment history.

**Response `200`:**
```json
{
  "customer": {
    "id": "...", "name": "Jane Smith", "email": "...", "phone": null,
    "subscriptions": [{ "id": "...", "status": "ACTIVE", "plan": { "name": "..." }, "vendor": { "name": "..." } }],
    "payments": [{ "id": "...", "amount": "49.00", "status": "PAID", "billingPeriod": "2026-07" }]
  }
}
```

---

### POST /api/platform/customers/:id/reset-password

Reset a customer's password.

**Body:** `{ "newPassword": "newpassword123" }`

**Response `200`:** `{ "ok": true }`

---

## Vendor Team

All endpoints require Admin role.

### GET /api/vendor/team

List all team members for the vendor.

**Response `200`:**
```json
{ "members": [{ "id": "...", "name": "...", "email": "...", "role": "ADMIN", "active": true, "createdAt": "..." }] }
```

---

### POST /api/vendor/team

Create a team member (VendorUser).

**Body:**
```json
{ "name": "Jane Worker", "email": "jane@freshmeals.com", "password": "password123", "role": "WORKER", "active": true }
```

**Response `201`:** `{ "member": { ... } }`

**Errors:** `409` email already in use

---

### PUT /api/vendor/team/:id

Update a team member. All fields optional. To change password, include `password`.

**Body:**
```json
{ "name": "Jane Smith", "role": "ADMIN", "active": false, "password": "newpassword" }
```

**Response `200`:** `{ "member": { ... } }`

---

### DELETE /api/vendor/team/:id

Permanently delete a team member.

**Response `200`:** `{ "ok": true }`

---

## Vendor Alerts

All endpoints require a vendor token.

### GET /api/vendor/alerts

List the latest 100 alerts for the vendor.

**Response `200`:**
```json
{ "alerts": [{ "id": "...", "type": "RENEWAL_REMINDER", "message": "...", "read": false, "createdAt": "...", "subscription": { "id": "...", "customer": { "name": "..." } } }] }
```

---

### POST /api/vendor/alerts

Create a manual alert.

**Body:**
```json
{ "message": "Custom alert text", "subscriptionId": "sub_abc", "type": "CUSTOM" }
```

`subscriptionId` and `type` are optional. `type` defaults to `CUSTOM`.

**Response `201`:** `{ "alert": { ... } }`

---

### PATCH /api/vendor/alerts/:id/read

Mark an alert as read.

**Response `200`:** `{ "message": "Marked as read" }`

---

### GET /api/vendor/alerts/rules

List all alert rules.

**Response `200`:** `{ "rules": [{ "id": "...", "name": "...", "trigger": "DAYS_BEFORE_RENEWAL", "daysOffset": 3, "active": true }] }`

---

### POST /api/vendor/alerts/rules

Create an alert rule.

**Body:**
```json
{
  "name": "3-day renewal reminder",
  "trigger": "DAYS_BEFORE_RENEWAL",
  "daysOffset": 3,
  "message": "Your subscription renews in 3 days",
  "active": true
}
```

Triggers: `DAYS_BEFORE_RENEWAL` (requires `daysOffset`), `PRODUCT_OUT_OF_STOCK` (requires `productId`), `MANUAL`.

**Response `201`:** `{ "rule": { ... } }`

---

### PUT /api/vendor/alerts/rules/:id

Update an alert rule. All fields optional.

**Response `200`:** `{ "rule": { ... } }`

---

### DELETE /api/vendor/alerts/rules/:id

Delete an alert rule.

**Response `200`:** `{ "message": "Deleted" }`

---

## Vendor Reports

All endpoints require a vendor token.

### GET /api/vendor/reports/dashboard

Dashboard summary data.

**Response `200`:**
```json
{
  "subscriptions": { "active": 42, "paused": 3, "cancelled": 12 },
  "totalRevenue": "2058.00",
  "topPlans": [{ "planId": "...", "name": "Weekly Meal Box", "count": 28 }],
  "recentPayments": [...],
  "upcomingRenewals": [...]
}
```

---

### GET /api/vendor/reports/revenue?period=30d

Revenue grouped by day.

**Query params:** `period` — `7d` | `30d` (default) | `90d`

**Response `200`:**
```json
{ "revenue": [{ "date": "2026-07-01", "amount": 490 }, { "date": "2026-07-08", "amount": 245 }] }
```

---

### GET /api/vendor/reports/export/subscriptions

Export all subscriptions as a CSV file.

**Response:** `text/csv` with `Content-Disposition: attachment; filename=subscriptions.csv`

Columns: `ID, Customer, Email, Plan, Status, Start Date`

---

## Customer Payment History

### GET /api/payments/history

Get authenticated customer's full payment history.

**Auth:** Customer token

**Response `200`:**
```json
{
  "payments": [{
    "id": "...", "amount": "49.00", "currency": "usd", "status": "PAID",
    "billingPeriod": "2026-07", "paidAt": "2026-07-01T...",
    "subscription": { "plan": { "name": "Weekly Meal Box" }, "vendor": { "name": "FreshMeals" } }
  }]
}
```

---

## Common Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Validation error — check `issues` field |
| `401` | Missing or invalid authentication token |
| `403` | Insufficient role (e.g. Worker on Admin-only endpoint) |
| `404` | Resource not found |
| `409` | Conflict — duplicate email, slug, etc. |
| `500` | Server error |

Error body format:
```json
{ "error": "Error message here", "issues": [...] }
```


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*