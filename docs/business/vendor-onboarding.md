# Vendor Onboarding Guide

This guide walks a new service business through everything they need to do to go live on ServStack.

---

## Step 1 — Create Your Vendor Account

Go to the platform registration page and sign up with:

- **Business name** — this appears on your customer portal
- **Email address** — used to log in and for platform communications
- **Password**

After registration you are taken directly to the Vendor Admin dashboard.

> Your portal is immediately available at `https://servstack.ca/portal/<your-slug>`. The slug is derived from your business name and can be changed in Settings.

---

## Step 2 — Set Up Your Product Catalogue

Before creating plans you need products in your catalogue.

### Add Categories (optional but recommended)

1. Go to **Products → Categories** tab
2. Click **Add Category** and name it (e.g. "Proteins", "Vegetables")
3. Expand a category and click **Add Sub-category** to create sub-groups (e.g. "White Meat", "Red Meat")

Categories help you organise your product list and make plan building easier.

### Add Products

1. Go to **Products → Products** tab
2. Click **Add Product**
3. Fill in the product details:

| Field | Required | Notes |
|-------|----------|-------|
| Code | Yes | Short unique identifier (e.g. `CHK-001`) |
| Name | Yes | Display name shown to customers |
| Category | Yes | Select from your categories |
| Sub-category | No | Appears after selecting a category |
| Weight/Size | No | Shown on customer portal |
| Description | No | Short description |
| Footnote | No | Fine print shown under the product |
| Alert Note | No | Internal note for your team |
| Price | No | Reference price — plan prices override this |
| Active | Yes | Inactive products are hidden from plans |

Add all the products you intend to offer before building plans.

---

## Step 3 — Create a Subscription Plan

Plans define what customers can subscribe to. You can create two types:

### Fixed Plan

Best for box subscriptions with defined contents.

1. Go to **Plans → Create Plan**
2. Choose **Fixed**
3. Name your plan and add a description
4. Add one or more **schedule tiers**:
   - Choose the frequency: Daily, Weekly, or Monthly
   - Set the price for that tier
5. For each tier, add **product groups**:
   - Give the group a name (e.g. "Protein", "Vegetables")
   - Set the selection rule:
     - **ALL** — all products always included
     - **CHOOSE ONE** — customer picks exactly one
     - **CHOOSE N** — customer picks exactly N (you set N)
   - Add products to the group
6. Save and **activate** the plan when ready

### Configurable Plan

Best for service businesses where customers mix and match.

1. Go to **Plans → Create Plan**
2. Choose **Configurable**
3. Name your plan and add a description
4. Add **products** to the plan:
   - For each product, select which frequencies are available (Daily, Weekly, Monthly)
   - Set the price for each allowed frequency
5. Save and **activate** the plan when ready

> Plans are **inactive by default**. Customers cannot subscribe until you activate a plan.

---

## Step 4 — Set Up Stripe (to Accept Payments)

ServStack uses Stripe to process subscription payments.

### Option A — Use Your Own Stripe Account (Recommended)

Payments go directly to your Stripe account. You keep full control of your revenue.

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers → API keys**
3. Copy your **Secret key**
4. In ServStack, go to **Settings → Stripe**
5. Paste your secret key and click Save
6. For webhooks:
   - In Stripe, go to **Developers → Webhooks → Add endpoint**
   - URL: `https://api.servstack.ca/api/payments/webhook`
   - Events to listen for: `checkout.session.completed`
   - Copy the **Signing secret**
   - Paste into ServStack Settings → Stripe → Webhook Secret

### Option B — Platform Stripe (Fallback)

If you do not configure your own Stripe keys, payments are processed through the platform's Stripe account. Contact the platform owner for revenue sharing details.

---

## Step 5 — Invite Team Members (Optional)

Add staff who need access to your admin portal.

1. Go to **Team**
2. Click **Invite Member**
3. Enter their name and email
4. Choose a role:
   - **Admin** — full access (same as the owner account, except they cannot change Stripe keys)
   - **Worker** — read-only access to dashboard, subscriptions, and alerts
5. The team member receives login credentials

---

## Step 6 — Share Your Portal

Your customer portal is live at:

```
https://servstack.ca/portal/<your-slug>
```

Share this URL with your customers. They can:
- Browse your active plans
- Register and subscribe
- Manage their subscription and selections
- Make payments via Stripe Checkout

### Custom Domain (Optional)

To use your own domain (e.g. `subscribe.yourcompany.com`):

1. Go to **Settings → Custom Domain**
2. Enter your domain
3. Add a CNAME record at your DNS provider pointing to `servstack.ca`
4. Allow up to 24 hours for DNS propagation

---

## Checklist Before Going Live

- [ ] At least one active product in your catalogue
- [ ] At least one active plan
- [ ] Stripe keys configured (or confirmed platform fallback is acceptable)
- [ ] Portal URL shared with your first customers
- [ ] Optional: custom domain set up

---

## What Happens When a Customer Subscribes

1. Customer visits your portal and browses your plans
2. They register (or log in) and select a plan
3. For Fixed plans: they choose their tier and make product selections
4. For Configurable plans: they check off the services they want and choose frequencies
5. They are redirected to Stripe Checkout to pay
6. On successful payment, the subscription is marked **Active**
7. Payment appears in your **Payments** dashboard
8. You can view and manage all subscriptions from **Subscriptions**


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*