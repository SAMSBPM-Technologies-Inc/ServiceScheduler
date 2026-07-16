import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireVendor } from '../../middleware/auth';

const router = Router();
router.use(requireVendor);

router.get('/', async (req, res) => {
  try {
    const { status, planId } = req.query;
    const where: any = { vendorId: req.vendor!.vendorId };
    if (status) where.status = status;
    if (planId) where.planId = planId;

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, planType: true } },
        selections: { include: { productGroup: true } },
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

router.get('/:id', async (req, res) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: req.params.id, vendorId: req.vendor!.vendorId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        plan: { include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } } },
        selections: { include: { productGroup: { include: { items: { include: { product: true } } } } } },
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

export default router;
