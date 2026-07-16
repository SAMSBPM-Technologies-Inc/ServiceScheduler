import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { requireVendor } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();
router.use(requireVendor);

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  weight: z.string().optional(),
  description: z.string().optional(),
  footnote: z.string().optional(),
  alertNote: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
});

router.get('/', async (req, res) => {
  try {
    const { category, search, active } = req.query;
    const where: any = { vendorId: req.vendor!.vendorId };
    if (category) where.category = category;
    if (active !== undefined) where.active = active === 'true';
    if (search) where.OR = [
      { name: { contains: search as string } },
      { code: { contains: search as string } },
    ];
    const products = await prisma.product.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', validate(productSchema), async (req, res) => {
  try {
    const vendorId = req.vendor!.vendorId;
    const existing = await prisma.product.findUnique({ where: { vendorId_code: { vendorId, code: req.body.code } } });
    if (existing) return res.status(409).json({ error: 'Product code already exists' });
    const product = await prisma.product.create({ data: { ...req.body, vendorId } });
    res.status(201).json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, vendorId: req.vendor!.vendorId } });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', validate(productSchema.partial()), async (req, res) => {
  try {
    const vendorId = req.vendor!.vendorId;
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, vendorId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.body.code && req.body.code !== existing.code) {
      const codeConflict = await prisma.product.findUnique({ where: { vendorId_code: { vendorId, code: req.body.code } } });
      if (codeConflict) return res.status(409).json({ error: 'Product code already exists' });
    }
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json({ product });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.product.findFirst({ where: { id: req.params.id, vendorId: req.vendor!.vendorId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ message: 'Product archived' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
