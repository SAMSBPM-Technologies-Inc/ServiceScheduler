import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean up
  await prisma.$transaction([
    prisma.alert.deleteMany(),
    prisma.alertRule.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscriptionSelection.deleteMany(),
    prisma.subscriptionTaskSchedule.deleteMany(),
    prisma.instruction.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.productGroupItem.deleteMany(),
    prisma.productGroup.deleteMany(),
    prisma.planScheduleTier.deleteMany(),
    prisma.configurablePlanProduct.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.product.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.vendor.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('password123', 12);

  // ── Vendor 1: Fresh Meals Co. ──────────────────────────────────────────────
  const freshMeals = await prisma.vendor.create({
    data: { name: 'Fresh Meals Co.', slug: 'fresh-meals', email: 'vendor@freshmeals.com', passwordHash },
  });

  const [prod1, prod2a, prod2b, prod3, prod4, prod5] = await Promise.all([
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD001', name: 'Rice', category: 'Grains', price: 2.5, active: true, description: 'Steamed basmati rice' } }),
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD002', name: 'Paneer Curry', category: 'Veg Mains', price: 5.0, active: true, description: 'Creamy paneer in tomato gravy' } }),
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD003', name: 'Dal Tadka', category: 'Veg Mains', price: 4.0, active: true, description: 'Yellow lentil with tempering' } }),
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD004', name: 'Raita', category: 'Sides', price: 1.5, active: true, description: 'Yoghurt with cucumber' } }),
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD005', name: 'Chicken Curry', category: 'Non-Veg Mains', price: 7.0, active: true, description: 'Spiced chicken in rich gravy' } }),
    prisma.product.create({ data: { vendorId: freshMeals.id, code: 'PROD006', name: 'Mutton Rogan Josh', category: 'Non-Veg Mains', price: 9.0, active: true, description: 'Kashmiri mutton curry' } }),
  ]);

  // Veg Meal Plan (FIXED)
  const vegPlan = await prisma.plan.create({
    data: { vendorId: freshMeals.id, name: 'Veg Meal Plan', description: 'Daily vegetarian meals with choice of main dish', planType: 'FIXED', active: true },
  });

  // Daily tier
  const dailyTier = await prisma.planScheduleTier.create({ data: { planId: vegPlan.id, tier: 'DAILY', price: 12.0 } });
  const dailyGroup1 = await prisma.productGroup.create({ data: { planScheduleTierId: dailyTier.id, name: 'Base', selectionRule: 'ALL', sortOrder: 1 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: dailyGroup1.id, productId: prod1.id }] });
  const dailyGroup2 = await prisma.productGroup.create({ data: { planScheduleTierId: dailyTier.id, name: 'Main Dish (choose one)', selectionRule: 'CHOOSE_ONE', sortOrder: 2 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: dailyGroup2.id, productId: prod2a.id, sortOrder: 0 }, { productGroupId: dailyGroup2.id, productId: prod2b.id, sortOrder: 1 }] });
  const dailyGroup3 = await prisma.productGroup.create({ data: { planScheduleTierId: dailyTier.id, name: 'Side', selectionRule: 'ALL', sortOrder: 3 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: dailyGroup3.id, productId: prod3.id }] });

  // Weekly tier
  const weeklyTier = await prisma.planScheduleTier.create({ data: { planId: vegPlan.id, tier: 'WEEKLY', price: 70.0 } });
  const weeklyGroup1 = await prisma.productGroup.create({ data: { planScheduleTierId: weeklyTier.id, name: 'Base', selectionRule: 'ALL', sortOrder: 1 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: weeklyGroup1.id, productId: prod1.id }] });
  const weeklyGroup2 = await prisma.productGroup.create({ data: { planScheduleTierId: weeklyTier.id, name: 'Main Dish (choose one)', selectionRule: 'CHOOSE_ONE', sortOrder: 2 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: weeklyGroup2.id, productId: prod2a.id, sortOrder: 0 }, { productGroupId: weeklyGroup2.id, productId: prod2b.id, sortOrder: 1 }] });
  const weeklyGroup3 = await prisma.productGroup.create({ data: { planScheduleTierId: weeklyTier.id, name: 'Side', selectionRule: 'ALL', sortOrder: 3 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: weeklyGroup3.id, productId: prod3.id }] });

  // Non-Veg Plan
  const nonVegPlan = await prisma.plan.create({
    data: { vendorId: freshMeals.id, name: 'Non-Veg Meal Plan', description: 'Daily non-vegetarian meals', planType: 'FIXED', active: true },
  });
  const nvDailyTier = await prisma.planScheduleTier.create({ data: { planId: nonVegPlan.id, tier: 'DAILY', price: 16.0 } });
  const nvGroup1 = await prisma.productGroup.create({ data: { planScheduleTierId: nvDailyTier.id, name: 'Base', selectionRule: 'ALL', sortOrder: 1 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: nvGroup1.id, productId: prod1.id }] });
  const nvGroup2 = await prisma.productGroup.create({ data: { planScheduleTierId: nvDailyTier.id, name: 'Main Dish (choose one)', selectionRule: 'CHOOSE_ONE', sortOrder: 2 } });
  await prisma.productGroupItem.createMany({ data: [{ productGroupId: nvGroup2.id, productId: prod4.id, sortOrder: 0 }, { productGroupId: nvGroup2.id, productId: prod5.id, sortOrder: 1 }] });

  // ── Vendor 2: SparkleClean ─────────────────────────────────────────────────
  const sparkle = await prisma.vendor.create({
    data: { name: 'SparkleClean', slug: 'sparkle-clean', email: 'vendor@sparkleclean.com', passwordHash },
  });

  const [sweep, mop, vacuum, toilet, garage, lawn] = await Promise.all([
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'SWEEP', name: 'Floor Sweeping', category: 'Floors', price: 10, active: true } }),
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'MOP', name: 'Floor Mopping', category: 'Floors', price: 12, active: true } }),
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'VACUUM', name: 'Vacuuming', category: 'Floors', price: 15, active: true } }),
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'TOILET', name: 'Toilet Cleaning', category: 'Bathrooms', price: 20, active: true } }),
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'GARAGE', name: 'Garage Cleaning', category: 'Outdoor', price: 35, active: true } }),
    prisma.product.create({ data: { vendorId: sparkle.id, code: 'LAWN', name: 'Lawn Maintenance', category: 'Outdoor', price: 40, active: true } }),
  ]);

  const cleanPlan = await prisma.plan.create({
    data: { vendorId: sparkle.id, name: 'Home Clean Plan', description: 'Choose your cleaning tasks and set individual schedules', planType: 'CONFIGURABLE', active: true },
  });
  await prisma.configurablePlanProduct.createMany({
    data: [
      { planId: cleanPlan.id, productId: sweep.id, allowedTiers: JSON.stringify(['DAILY', 'WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ DAILY: 10, WEEKLY: 30, MONTHLY: 80 }) },
      { planId: cleanPlan.id, productId: mop.id, allowedTiers: JSON.stringify(['DAILY', 'WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ DAILY: 12, WEEKLY: 36, MONTHLY: 96 }) },
      { planId: cleanPlan.id, productId: vacuum.id, allowedTiers: JSON.stringify(['DAILY', 'WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ DAILY: 15, WEEKLY: 45, MONTHLY: 120 }) },
      { planId: cleanPlan.id, productId: toilet.id, allowedTiers: JSON.stringify(['WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ WEEKLY: 40, MONTHLY: 100 }) },
      { planId: cleanPlan.id, productId: garage.id, allowedTiers: JSON.stringify(['WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ WEEKLY: 60, MONTHLY: 150 }) },
      { planId: cleanPlan.id, productId: lawn.id, allowedTiers: JSON.stringify(['WEEKLY', 'MONTHLY']), pricePerTier: JSON.stringify({ WEEKLY: 70, MONTHLY: 180 }) },
    ],
  });

  // ── Demo Customers ────────────────────────────────────────────────────────
  const [alice, bob] = await Promise.all([
    prisma.customer.create({ data: { name: 'Alice Johnson', email: 'alice@example.com', passwordHash } }),
    prisma.customer.create({ data: { name: 'Bob Smith', email: 'bob@example.com', passwordHash } }),
  ]);

  // Alice subscribes to Veg Meal Plan (DAILY, chooses Paneer Curry)
  const aliceSub = await prisma.subscription.create({
    data: { customerId: alice.id, planId: vegPlan.id, vendorId: freshMeals.id, selectedTier: 'DAILY', status: 'ACTIVE' },
  });
  await prisma.subscriptionSelection.create({ data: { subscriptionId: aliceSub.id, productGroupId: dailyGroup2.id, productId: prod2a.id } });
  await prisma.instruction.create({ data: { subscriptionId: aliceSub.id, text: 'Leave at the front door. No onions please.' } });
  await prisma.payment.create({
    data: { subscriptionId: aliceSub.id, customerId: alice.id, vendorId: freshMeals.id, amount: 12.0, billingPeriod: '2026-07', status: 'PAID', paidAt: new Date() },
  });

  // Bob subscribes to SparkleClean (vacuum=DAILY, toilet=WEEKLY, garage=MONTHLY)
  const bobSub = await prisma.subscription.create({
    data: { customerId: bob.id, planId: cleanPlan.id, vendorId: sparkle.id, status: 'ACTIVE' },
  });
  await prisma.subscriptionTaskSchedule.createMany({
    data: [
      { subscriptionId: bobSub.id, productId: vacuum.id, tier: 'DAILY', price: 15 },
      { subscriptionId: bobSub.id, productId: toilet.id, tier: 'WEEKLY', price: 40 },
      { subscriptionId: bobSub.id, productId: garage.id, tier: 'MONTHLY', price: 150 },
    ],
  });
  await prisma.instruction.create({ data: { subscriptionId: bobSub.id, text: 'Use eco-friendly detergent. Key under mat.' } });
  await prisma.payment.create({
    data: { subscriptionId: bobSub.id, customerId: bob.id, vendorId: sparkle.id, amount: 205.0, billingPeriod: '2026-07', status: 'PAID', paidAt: new Date() },
  });

  // Alert rules
  await prisma.alertRule.createMany({
    data: [
      { vendorId: freshMeals.id, name: '3-day renewal reminder', trigger: 'DAYS_BEFORE_RENEWAL', daysOffset: 3, message: 'Your subscription renews in 3 days.', active: true },
      { vendorId: sparkle.id, name: 'Renewal reminder', trigger: 'DAYS_BEFORE_RENEWAL', daysOffset: 5, message: 'Cleaning service renewal in 5 days.', active: true },
    ],
  });

  await prisma.alert.createMany({
    data: [
      { vendorId: freshMeals.id, subscriptionId: aliceSub.id, type: 'RENEWAL_REMINDER', message: "Alice Johnson's subscription renews soon.", read: false },
      { vendorId: sparkle.id, subscriptionId: bobSub.id, type: 'RENEWAL_REMINDER', message: "Bob Smith's cleaning service renews soon.", read: false },
    ],
  });

  console.log('Seeded vendors: fresh-meals, sparkle-clean');
  console.log('Seeded customers: alice@example.com, bob@example.com (password: password123)');
  console.log('Seeded vendor logins: vendor@freshmeals.com, vendor@sparkleclean.com (password: password123)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
