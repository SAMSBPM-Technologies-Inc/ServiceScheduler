import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requirePlatformAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requirePlatformAdmin)

// GET /  — list all vendors with summary stats
app.get('/', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true, name: true, email: true, slug: true, customDomain: true, createdAt: true,
        _count: { select: { subscriptions: true, plans: true, vendorUsers: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return c.json({ vendors })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// GET /:id  — vendor detail with plans, team, recent subscriptions
app.get('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({
      where: { id: c.req.param('id') },
      select: {
        id: true, name: true, email: true, slug: true, customDomain: true,
        createdAt: true, updatedAt: true,
        stripeSecretKey: true, // presence only — shown as boolean
        plans: {
          select: { id: true, name: true, planType: true, active: true, createdAt: true, _count: { select: { subscriptions: true } } },
          orderBy: { createdAt: 'desc' },
        },
        vendorUsers: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        subscriptions: {
          select: {
            id: true, status: true, createdAt: true,
            customer: { select: { id: true, name: true, email: true } },
            plan: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { subscriptions: true, plans: true, vendorUsers: true } },
      },
    })
    if (!vendor) return c.json({ error: 'Not found' }, 404)
    return c.json({
      vendor: {
        ...vendor,
        hasStripeKey: !!vendor.stripeSecretKey,
        stripeSecretKey: undefined, // never expose the actual key
      },
    })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// PATCH /:id  — update vendor name / slug / customDomain
app.patch('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const schema = z.object({
      name: z.string().min(1).optional(),
      slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      customDomain: z.string().nullable().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({ where: { id: c.req.param('id') } })
    if (!vendor) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, slug: true, customDomain: true },
    })
    return c.json({ vendor: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// POST /:id/reset-password  — reset vendor owner password
app.post('/:id/reset-password', async (c) => {
  try {
    const { newPassword } = await c.req.json()
    if (!newPassword || newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({ where: { id: c.req.param('id') } })
    if (!vendor) return c.json({ error: 'Not found' }, 404)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.vendor.update({ where: { id: vendor.id }, data: { passwordHash } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// POST /:id/users/:userId/reset-password  — reset a team member password
app.post('/:id/users/:userId/reset-password', async (c) => {
  try {
    const { newPassword } = await c.req.json()
    if (!newPassword || newPassword.length < 8) return c.json({ error: 'Password must be at least 8 characters' }, 400)
    const prisma = getPrisma(c.env.DB)
    const user = await prisma.vendorUser.findFirst({
      where: { id: c.req.param('userId'), vendorId: c.req.param('id') },
    })
    if (!user) return c.json({ error: 'Not found' }, 404)
    const passwordHash = await bcrypt.hash(newPassword, 12)
    await prisma.vendorUser.update({ where: { id: user.id }, data: { passwordHash } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// PATCH /:id/users/:userId  — toggle active / change role for a team member
app.patch('/:id/users/:userId', async (c) => {
  try {
    const body = await c.req.json()
    const schema = z.object({
      active: z.boolean().optional(),
      role: z.enum(['ADMIN', 'WORKER']).optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error' }, 400)
    const prisma = getPrisma(c.env.DB)
    const user = await prisma.vendorUser.findFirst({
      where: { id: c.req.param('userId'), vendorId: c.req.param('id') },
    })
    if (!user) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.vendorUser.update({
      where: { id: user.id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    return c.json({ user: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
