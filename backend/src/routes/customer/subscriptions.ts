import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireCustomer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { validatePlanSelection } from '../../services/planSelection';

const router = Router();
router.use(requireCustomer);

const scheduleTierEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);

const subscribeFixedSchema = z.object({
  planId: z.string(),
  selectedTier: scheduleTierEnum,
  selections: z.array(z.object({ productGroupId: z.string(), productId: z.string() })).default([]),
});

const subscribeConfigurableSchema = z.object({
  planId: z.string(),
  taskSchedules: z.array(z.object({ productId: z.string(), tier: scheduleTierEnum, price: z.number().min(0) })).min(1),
});

router.get('/', async (req, res) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: req.customer!.customerId },
      include: {
        plan: { select: { id: true, name: true, planType: true } },
        vendor: { select: { id: true, name: true, slug: true } },
        selections: { include: { productGroup: { select: { name: true } } } },
        taskSchedules: true,
        instructions: true,
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/fixed', validate(subscribeFixedSchema), async (req, res) => {
  try {
    const customerId = req.customer!.customerId;
    const { planId, selectedTier, selections } = req.body;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { scheduleTiers: { include: { productGroups: { include: { items: true } } } } },
    });
    if (!plan || !plan.active) return res.status(404).json({ error: 'Plan not found or inactive' });
    if (plan.planType !== 'FIXED') return res.status(400).json({ error: 'Use /configurable for configurable plans' });

    const validation = validatePlanSelection(plan, selectedTier, selections);
    if (!validation.valid) return res.status(400).json({ error: validation.error });

    const tierRecord = plan.scheduleTiers.find((t) => t.tier === selectedTier);
    if (!tierRecord) return res.status(400).json({ error: 'Invalid tier' });

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: { customerId, planId, vendorId: plan.vendorId, selectedTier, status: 'ACTIVE' },
      });
      for (const sel of selections) {
        await tx.subscriptionSelection.create({ data: { subscriptionId: sub.id, productGroupId: sel.productGroupId, productId: sel.productId } });
      }
      // Create a pending payment
      await tx.payment.create({
        data: {
          subscriptionId: sub.id, customerId, vendorId: plan.vendorId,
          amount: tierRecord.price, currency: 'usd',
          billingPeriod: new Date().toISOString().slice(0, 7), status: 'PENDING',
        },
      });
      return sub;
    });

    res.status(201).json({ subscription });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/configurable', validate(subscribeConfigurableSchema), async (req, res) => {
  try {
    const customerId = req.customer!.customerId;
    const { planId, taskSchedules } = req.body;

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { configurableProducts: true },
    });
    if (!plan || !plan.active) return res.status(404).json({ error: 'Plan not found or inactive' });
    if (plan.planType !== 'CONFIGURABLE') return res.status(400).json({ error: 'Use /fixed for fixed plans' });

    // Validate each task/tier combo is allowed
    for (const ts of taskSchedules) {
      const cp = plan.configurableProducts.find((p) => p.productId === ts.productId);
      if (!cp) return res.status(400).json({ error: `Product ${ts.productId} not in plan` });
      const allowedTiers = (typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers) as string[];
      if (!allowedTiers.includes(ts.tier)) return res.status(400).json({ error: `Tier ${ts.tier} not allowed for product ${ts.productId}` });
    }

    const totalAmount = taskSchedules.reduce((sum: number, ts: any) => sum + ts.price, 0);

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({ data: { customerId, planId, vendorId: plan.vendorId, status: 'ACTIVE' } });
      for (const ts of taskSchedules) {
        await tx.subscriptionTaskSchedule.create({ data: { subscriptionId: sub.id, productId: ts.productId, tier: ts.tier, price: ts.price } });
      }
      await tx.payment.create({
        data: {
          subscriptionId: sub.id, customerId, vendorId: plan.vendorId,
          amount: totalAmount, currency: 'usd',
          billingPeriod: new Date().toISOString().slice(0, 7), status: 'PENDING',
        },
      });
      return sub;
    });

    res.status(201).json({ subscription });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: req.params.id, customerId: req.customer!.customerId },
      include: {
        plan: { include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } } },
        vendor: { select: { id: true, name: true, slug: true } },
        selections: { include: { productGroup: true } },
        taskSchedules: true,
        instructions: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!subscription) return res.status(404).json({ error: 'Not found' });
    res.json({ subscription });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const subscription = await prisma.subscription.findFirst({ where: { id: req.params.id, customerId: req.customer!.customerId } });
    if (!subscription) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.subscription.update({ where: { id: req.params.id }, data: { status, endDate: status === 'CANCELLED' ? new Date() : null } });
    res.json({ subscription: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Instructions
router.put('/:id/instructions', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const subscription = await prisma.subscription.findFirst({ where: { id: req.params.id, customerId: req.customer!.customerId } });
    if (!subscription) return res.status(404).json({ error: 'Not found' });
    // Upsert: delete all old, create new
    await prisma.instruction.deleteMany({ where: { subscriptionId: req.params.id } });
    const instruction = await prisma.instruction.create({ data: { subscriptionId: req.params.id, text } });
    res.json({ instruction });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
