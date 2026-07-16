import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireVendor } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(requireVendor);

const alertRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(['DAYS_BEFORE_RENEWAL', 'PRODUCT_OUT_OF_STOCK', 'MANUAL']),
  daysOffset: z.number().int().optional(),
  productId: z.string().optional(),
  message: z.string().min(1),
  active: z.boolean().default(true),
});

// Alert rules CRUD
router.get('/rules', async (req, res) => {
  try {
    const rules = await prisma.alertRule.findMany({ where: { vendorId: req.vendor!.vendorId }, orderBy: { createdAt: 'desc' } });
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rules', validate(alertRuleSchema), async (req, res) => {
  try {
    const rule = await prisma.alertRule.create({ data: { ...req.body, vendorId: req.vendor!.vendorId } });
    res.status(201).json({ rule });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/rules/:id', validate(alertRuleSchema.partial()), async (req, res) => {
  try {
    const rule = await prisma.alertRule.findFirst({ where: { id: req.params.id, vendorId: req.vendor!.vendorId } });
    if (!rule) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.alertRule.update({ where: { id: req.params.id }, data: req.body });
    res.json({ rule: updated });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/rules/:id', async (req, res) => {
  try {
    const rule = await prisma.alertRule.findFirst({ where: { id: req.params.id, vendorId: req.vendor!.vendorId } });
    if (!rule) return res.status(404).json({ error: 'Not found' });
    await prisma.alertRule.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Alert log
router.get('/', async (req, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { vendorId: req.vendor!.vendorId },
      include: { subscription: { select: { id: true, customer: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ alerts });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const alert = await prisma.alert.findFirst({ where: { id: req.params.id, vendorId: req.vendor!.vendorId } });
    if (!alert) return res.status(404).json({ error: 'Not found' });
    await prisma.alert.update({ where: { id: req.params.id }, data: { read: true } });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual alert creation
router.post('/', async (req, res) => {
  try {
    const { message, subscriptionId, type } = req.body;
    const alert = await prisma.alert.create({
      data: { vendorId: req.vendor!.vendorId, message, subscriptionId, type: type || 'CUSTOM' },
    });
    res.status(201).json({ alert });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
