import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { signCustomerToken, requireCustomer } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const existing = await prisma.customer.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const customer = await prisma.customer.create({ data: { name, email, passwordHash, phone } });
    const token = signCustomerToken({ customerId: customer.id, email: customer.email });
    res.status(201).json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signCustomerToken({ customerId: customer.id, email: customer.email });
    res.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireCustomer, async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.customer!.customerId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });
    if (!customer) return res.status(404).json({ error: 'Not found' });
    res.json({ customer });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
