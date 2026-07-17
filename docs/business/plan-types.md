# Plan Types Explained

ServStack supports two plan types to cover different business models: **Fixed** and **Configurable**.

---

## Fixed Plans

A Fixed plan is a pre-packaged subscription where the vendor defines exactly what is available at each price point. The customer chooses a tier and then selects from the options the vendor has set up.

### How it works

**Step 1 — Vendor creates the plan structure:**
- Define one or more schedule tiers (e.g. Weekly at $49, Monthly at $179)
- Each tier contains product groups
- Each product group has a selection rule and a list of products

**Step 2 — Customer subscribes:**
- Picks a tier (weekly, monthly, etc.)
- Makes selections within each product group according to the rules
- Pays the fixed price for that tier

### Product Group Selection Rules

| Rule | Meaning | Example |
|------|---------|---------|
| `ALL` | All products in this group are always included | "Standard vegetables always included" |
| `CHOOSE_ONE` | Customer picks exactly one product | "Choose your protein: Chicken, Salmon, or Beef" |
| `CHOOSE_N` | Customer picks exactly N products | "Choose any 3 vegetables" |

### Example — Weekly Meal Box Plan

```
Plan: "Weekly Meal Box"

Tier: WEEKLY — $49/week
  ├── Group: "Protein" (CHOOSE_ONE)
  │       ├── Chicken Breast
  │       ├── Salmon Fillet
  │       └── Beef Sirloin
  ├── Group: "Vegetables" (CHOOSE_N, choose 3)
  │       ├── Broccoli
  │       ├── Spinach
  │       ├── Carrots
  │       └── Zucchini
  └── Group: "Pantry Staples" (ALL)
          ├── Olive Oil
          └── Seasoning Pack

Tier: MONTHLY — $179/month
  └── (same product groups, different price)
```

### Best for
- Meal kit deliveries
- Box subscriptions with defined contents
- Services with clear packages (Basic / Standard / Premium)

---

## Configurable Plans

A Configurable plan is a build-your-own subscription where the vendor defines available services and their pricing, and the customer constructs their own custom schedule.

### How it works

**Step 1 — Vendor sets up configurable products:**
- Lists available products/services
- For each product, specifies which frequencies are allowed (DAILY, WEEKLY, MONTHLY)
- Sets a price for each allowed frequency

**Step 2 — Customer subscribes:**
- Checks off which services they want
- For each selected service, picks their preferred frequency
- The total price is the sum of all selected service prices (computed server-side)

### Example — Custom Lawn Care Plan

```
Plan: "Custom Lawn Care"

Available services:
  ├── Lawn Mowing
  │       ├── WEEKLY — $35
  │       └── MONTHLY — $120
  ├── Hedge Trimming
  │       └── MONTHLY — $45
  ├── Fertilising
  │       └── MONTHLY — $30
  └── Leaf Blowing
          ├── WEEKLY — $20
          └── MONTHLY — $70

Customer A subscribes:
  ├── Lawn Mowing — WEEKLY ($35)
  └── Fertilising — MONTHLY ($30)
  Total: $65/billing cycle

Customer B subscribes:
  ├── Lawn Mowing — MONTHLY ($120)
  ├── Hedge Trimming — MONTHLY ($45)
  └── Leaf Blowing — WEEKLY ($20)
  Total: $185/billing cycle
```

### Best for
- Service businesses where each customer needs a different combination
- Home maintenance (mowing + edging + fertilising, mixed frequencies)
- Cleaning services (living room weekly, bathrooms fortnightly, deep clean monthly)
- Pet care (dog walking 3x week, grooming monthly)

---

## Comparison

| Feature | Fixed | Configurable |
|---------|-------|-------------|
| Price per tier | Single fixed price | Sum of selected services |
| Customer flexibility | Choose within defined options | Choose any combination |
| Selection rules | ALL / CHOOSE_ONE / CHOOSE_N | Checkbox per service |
| Best for | Box subscriptions, packages | Custom service schedules |
| Price control | Vendor sets tier price | Vendor sets per-service prices (server enforced) |


---

*Built by [SAMSBPM Technologies Inc](https://samsbpm.ca)*