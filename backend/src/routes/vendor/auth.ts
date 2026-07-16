import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { signVendorToken, requireVendor } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, slug } = req.body;
    const existing = await prisma.vendor.findFirst({ where: { OR: [{ email }, { slug }] } });
    if (existing) {
      return res.status(409).json({ error: existing.email === email ? 'Email already in use' : 'Slug already taken' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const vendor = await prisma.vendor.create({ data: { name, email, passwordHash, slug } });
    const token = signVendorToken({ vendorId: vendor.id, email: vendor.email });
    res.status(201).json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, slug: vendor.slug } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const vendor = await prisma.vendor.findUnique({ where: { email } });
    if (!vendor || !(await bcrypt.compare(password, vendor.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signVendorToken({ vendorId: vendor.id, email: vendor.email });
    res.json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, slug: vendor.slug, logoUrl: vendor.logoUrl } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireVendor, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.vendor!.vendorId },
      select: { id: true, name: true, email: true, slug: true, logoUrl: true, createdAt: true },
    });
    if (!vendor) return res.status(404).json({ error: 'Not found' });
    res.json({ vendor });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
