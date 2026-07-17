# Vendor Admin Guide

This guide covers everything a Vendor Admin can do in the ServStack vendor portal.

**URL:** `https://servstack.ca/vendor`

Vendor Admins have full access to all features. The vendor account owner is always an Admin. Additional team members can be assigned the Admin role.

---

## Dashboard

The dashboard gives you an at-a-glance view of your business:

- **Active subscriptions** — total number of subscriptions currently active
- **Revenue this month** — total paid payments in the current calendar month
- **Pending payments** — payments awaiting completion
- **Recent alerts** — latest notifications requiring your attention

---

## Products

### Products Tab

View and manage your product catalogue.

**Adding a product:**
1. Click **Add Product**
2. Fill in the product details — Code (unique identifier), Name, Category, Price, and any optional fields
3. Toggle **Active** on to make the product available for use in plans
4. Click **Save**

**Editing a product:**
Click any product row to open the edit form. Make changes and click **Save**.

**Deactivating a product:**
Toggle the **Active** switch off. Deactivated products are hidden from plan configuration but existing plan assignments are retained.

> Products cannot be deleted once they are referenced by a plan or subscription. Deactivate them instead.

### Categories Tab

Manage the category structure used to organise your products.

**Adding a category:**
Click **Add Category**, enter a name, and confirm.

**Adding a sub-category:**
Expand a category row by clicking the arrow, then click **Add Sub-category**.

**Renaming:**
Click the pencil icon next to any category or sub-category name.

**Deleting:**
Click the trash icon. Deleting a category also deletes all its sub-categories. Products assigned to deleted categories will show the raw category name until reassigned.

---

## Plans

Plans define what customers can subscribe to.

### Creating a Fixed Plan

1. Click **Create Plan → Fixed**
2. Enter a name and optional description
3. Add one or more **Schedule Tiers** (Daily / Weekly / Monthly) with prices
4. For each tier, add **Product Groups**:
   - Name the group
   - Set the selection rule (ALL / CHOOSE ONE / CHOOSE N)
   - Add products to the group
5. Click **Save**
6. Toggle the plan **Active** to make it subscribable

### Creating a Configurable Plan

1. Click **Create Plan → Configurable**
2. Enter a name and optional description
3. Add products to the plan:
   - Select a product
   - Tick which frequencies are allowed
   - Enter the price for each allowed frequency
4. Click **Save**
5. Toggle the plan **Active** to make it subscribable

### Editing a Plan

Click a plan to open it. You can:
- Change the name or description
- Add or remove tiers/product groups (Fixed) or products (Configurable)
- Activate or deactivate the plan

> Deactivating a plan hides it from the customer portal. Existing subscriptions are not affected.

---

## Subscriptions

View all subscriptions across your customer base.

### Subscription List

- Filter by status: All / Active / Paused / Cancelled
- Click any subscription to open the detail view

### Subscription Detail

From a subscription's detail page you can:

**Change status:**
- **Pause** — temporarily suspends the subscription
- **Resume** — reactivates a paused subscription
- **Cancel** — permanently ends the subscription

**Edit product selections (Fixed plans):**
Click **Edit Selections** to change which products the customer has chosen for each group. The interface mirrors what the customer sees when subscribing — radio cards for CHOOSE ONE, checkboxes for CHOOSE N.

**Edit schedule (Configurable plans):**
Click **Edit Schedule** to change which services the customer is receiving and at what frequency.

**Add/edit instructions:**
The Instructions field lets you attach notes that your team can see (e.g. "Leave at side gate", "No nuts — allergy").

---

## Payments

View all payment records for your subscriptions.

- **Status filters:** All / Pending / Paid / Failed / Refunded
- Each payment shows: amount, billing period, customer name, subscription, and Stripe reference
- Click a payment to see full detail

> Refunds are processed in your Stripe Dashboard. The payment status is updated via webhook.

---

## Alerts

Alerts notify you of events that may require action.

- **RENEWAL_REMINDER** — a subscription renewal is approaching
- **LOW_STOCK** — a product is flagged as low stock
- **MISSED_DELIVERY** — a delivery was not completed
- **CUSTOM** — manually created alerts

### Alert Rules

Set up automatic alert generation under **Alerts → Rules**:

1. Click **Add Rule**
2. Choose a trigger:
   - **Days before renewal** — fires N days before a subscription renews
   - **Product out of stock** — fires when a specific product is flagged
   - **Manual** — you fire it yourself
3. Write the alert message template
4. Save and activate the rule

---

## Team

Manage who has access to your vendor portal.

### Inviting a Team Member

1. Click **Invite Member**
2. Enter their name and email address
3. Choose role:
   - **Admin** — full access to all features
   - **Worker** — read-only access
4. Confirm — the member can log in with these credentials

### Managing Team Members

- **Change role:** Click the role badge to toggle between Admin and Worker
- **Deactivate:** Toggle the Active switch to prevent login without deleting the account
- **Reactivate:** Toggle Active back on

---

## Settings

### General

- **Business name** — displayed on your customer portal
- **Slug** — the URL path for your portal (`/portal/<slug>`)
- **Logo URL** — displayed on the customer portal header

### Custom Domain

Enter a custom domain (e.g. `subscribe.yourcompany.com`) to give customers a branded experience. You must add a CNAME record at your DNS provider pointing to `servstack.ca`.

### Stripe Integration

Enter your Stripe keys to receive payments directly to your Stripe account:

- **Secret Key** — your Stripe secret key (`sk_live_...`)
- **Webhook Secret** — your Stripe webhook signing secret

Both values are encrypted at rest. See the [Vendor Onboarding Guide](vendor-onboarding.md) for setup instructions.

---

## Customer Portal

Your customer portal is at: `https://servstack.ca/portal/<your-slug>`

This is what your customers see. It shows:
- Your active plans
- A login/register option for customers
- After login: subscription management and payment history

Customers interact only with your data — they cannot see other vendors.


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*