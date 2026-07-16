import { Router } from 'express';
import { prisma } from '../../lib/prisma';

const router = Router();

router.get('/vendor/:slug', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    res.json({ vendor });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/vendor/:slug/plans', async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { slug: req.params.slug } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const plans = await prisma.plan.findMany({
      where: { vendorId: vendor.id, active: true },
      include: {
        scheduleTiers: { include: { productGroups: { include: { items: { include: { product: { select: { id: true, name: true, code: true, description: true, price: true } } } } } } } },
        configurableProducts: { include: { product: { select: { id: true, name: true, code: true, category: true, description: true } } } },
      },
    });
    const parsed = plans.map((plan) => ({
      ...plan,
      configurableProducts: plan.configurableProducts.map((cp) => ({
        ...cp,
        allowedTiers: typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers,
        pricePerTier: typeof cp.pricePerTier === 'string' ? JSON.parse(cp.pricePerTier) : cp.pricePerTier,
      })),
    }));
    res.json({ plans: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
