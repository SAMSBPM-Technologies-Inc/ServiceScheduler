import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { getPrisma } from '../../lib/db'
import { requirePlatformAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requirePlatformAdmin)

// GET /  — list all customers (optionally filtered by vendorId via their subscriptions)
app.get('/', async (c) => {
  try {
    const { vendorId, search } = c.req.query()
    const prisma = getPrisma(c.env.DB)
    const customers = await prisma.customer.findMany({
      where: {
        ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
        ...(vendorId ? { subscriptions: { some: { vendorId } } } : {}),
      },
      select: {
        id: true, name: true, email: true, phone: true, createdAt: true,
        _count: { select: { subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return c.json({ customers })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// GET /:id  — customer detail with subscriptions
app.get('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const customer = await prisma.customer.findUnique({
      where: { id: c.req.param('id') },
      select: {
        id: true, name: true, email: true, phone: true, createdAt: true,
        subscriptions: {
          select: {
            id: true, status: true, createdAt: true,
            plan: { select: { name: true, planType: true } },
            vendor: { select: { name: true, slug: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          select: { id: true, amount: true, status: true, billingPeriod: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })
    if (!customer) return c.json({ error: 'Not found' }, 404)
    return c.json({ customer })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// POST /:id/reset-password  — reset customer password
app.post('/:id/reset-password', async (c) => {
  try {
    const { newPassword } = await c.req.json()
    if (!newPassword || newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
    const prisma = getPrisma(c.env.DB)
    const customer = await prisma.customer.findUnique({ where: { id: c.req.param('id') } })
    if (!customer) return c.json({ error: 'Not found' }, 404)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.customer.update({ where: { id: customer.id }, data: { passwordHash } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
