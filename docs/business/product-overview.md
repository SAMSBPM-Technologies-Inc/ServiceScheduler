# Product Overview

## What is ServStack?

ServStack is a white-label subscription management platform for service businesses. It enables any service provider — from meal delivery companies to cleaning services, lawn care businesses, pet groomers, and more — to offer their customers recurring scheduled service subscriptions through a branded portal.

Vendors sign up, configure their service catalogue and plans, and share a custom portal link with their customers. Customers browse plans, subscribe, make payments via Stripe, and manage their subscriptions — all without the vendor building any custom software.

---

## Who is ServStack for?

### Vendors (Service Businesses)
Any business that delivers a recurring service on a schedule:
- Meal prep and grocery delivery services
- Cleaning and housekeeping companies
- Lawn and garden maintenance
- Laundry and dry cleaning pickup services
- Pet grooming and dog walking services
- Handyman and home maintenance companies

### Customers (End Users)
Individuals or households who want to subscribe to a vendor's services and manage their schedule, selections, and payments in one place.

### Platform Owner
The operator of ServStack who manages all vendors and customers across the platform through a dedicated admin panel.

---

## Core Concepts

### Vendors
Each vendor is an independent tenant on the platform. Vendors have:
- Their own product catalogue
- Their own subscription plans
- Their own team members (admins and workers)
- Their own Stripe account (optional — falls back to platform Stripe keys)
- Their own branded customer portal (at `/portal/:slug` or a custom domain)

### Plans
Vendors create subscription plans of two types:

**Fixed Plans** — The vendor defines a complete service schedule with tiers (daily/weekly/monthly pricing), product groups, and selection rules. Customers choose a tier and make their selections from the available products.

**Configurable Plans** — The vendor defines a menu of available products and services, each with allowed frequencies and pricing. Customers build their own custom schedule by choosing which services they want and how often.

### Subscriptions
A subscription links a customer to a plan. It can be:
- **Active** — services are being delivered
- **Paused** — temporarily suspended
- **Cancelled** — ended

### Payments
Each subscription generates a payment record per billing cycle. Payments are processed through Stripe Checkout. Vendors can use their own Stripe account or use the platform's Stripe integration.

---

## Platform Architecture (Summary)

```
Platform Owner
    │
    ├── Vendor A (FreshMeals)
    │       ├── Products (Chicken, Salmon, Salad...)
    │       ├── Plans (Weekly Meal Box, Custom Meal Plan)
    │       ├── Team (Admin + Workers)
    │       └── Customers + Subscriptions
    │
    ├── Vendor B (GreenLawn)
    │       ├── Products (Mowing, Edging, Fertilising...)
    │       └── ...
    │
    └── Vendor C (CleanHome)
            └── ...
```

All vendors are fully isolated — a vendor can only see and manage their own data.

---

## Key Differentiators

- **No-code vendor setup** — Vendors configure everything through a UI, no technical knowledge required
- **Flexible plan types** — Supports both fixed-menu and build-your-own subscription models
- **White-label portals** — Customers interact with the vendor's brand, not "ServStack"
- **Custom domains** — Vendors can map their own domain (e.g. `subscribe.freshmeals.com`) to their portal
- **Per-vendor Stripe** — Vendors bring their own Stripe account; payments go directly to them
- **Role-based team access** — Vendors can add team members as Admins (full access) or Workers (read-only)


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*