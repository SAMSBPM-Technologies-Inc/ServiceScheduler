import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { signCustomerToken, requireCustomer } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
})

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })

app.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const { name, email, password, phone } = parsed.data
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.customer.findUnique({ where: { email } })
    if (existing) return c.json({ error: 'Email already in use' }, 409)
    const passwordHash = await bcrypt.hash(password, 12)
    const customer = await prisma.customer.create({ data: { name, email, passwordHash, phone } })
    const token = await signCustomerToken({ customerId: customer.id, email: customer.email }, c.env.JWT_CUSTOMER_SECRET)
    return c.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email } }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const { email, password } = parsed.data
    const prisma = getPrisma(c.env.DB)
    const customer = await prisma.customer.findUnique({ where: { email } })
    if (!customer || !(await bcrypt.compare(password, customer.passwordHash))) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    const token = await signCustomerToken({ customerId: customer.id, email: customer.email }, c.env.JWT_CUSTOMER_SECRET)
    return c.json({ token, customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/me', requireCustomer, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const customer = await prisma.customer.findUnique({
      where: { id: c.get('customer').customerId },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    })
    if (!customer) return c.json({ error: 'Not found' }, 404)
    return c.json({ customer })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
