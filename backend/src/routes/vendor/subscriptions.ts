import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireVendor)

app.get('/', async (c) => {
  try {
    const { status, planId } = c.req.query()
    const where: any = { vendorId: c.get('vendor').vendorId }
    if (status) where.status = status
    if (planId) where.planId = planId

    const prisma = getPrisma(c.env.DB)
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
    })
    return c.json({ subscriptions })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const subscription = await prisma.subscription.findFirst({
      where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        plan: {
          include: {
            scheduleTiers: { include: { productGroups: { orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' }, include: { product: true } } } } } },
            configurableProducts: { include: { product: true } },
          },
        },
        selections: { include: { productGroup: true } },
        taskSchedules: true,
        instructions: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!subscription) return c.json({ error: 'Not found' }, 404)
    return c.json({ subscription })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// Vendor can pause / cancel / resume a subscription
app.patch('/:id/status', async (c) => {
  try {
    const body = await c.req.json()
    const { status } = body
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
    const prisma = getPrisma(c.env.DB)
    const sub = await prisma.subscription.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!sub) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.subscription.update({
      where: { id: c.req.param('id') },
      data: { status, endDate: status === 'CANCELLED' ? new Date() : null },
    })
    return c.json({ subscription: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

const selectionsSchema = z.object({
  selections: z.array(z.object({ productGroupId: z.string(), productId: z.string() })),
})

// Vendor can edit product selections for a fixed plan subscription
app.put('/:id/selections', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = selectionsSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const sub = await prisma.subscription.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!sub) return c.json({ error: 'Not found' }, 404)
    await prisma.subscriptionSelection.deleteMany({ where: { subscriptionId: c.req.param('id') } })
    if (parsed.data.selections.length > 0) {
      await prisma.$transaction(
        parsed.data.selections.map((sel) =>
          prisma.subscriptionSelection.create({
            data: { id: crypto.randomUUID(), subscriptionId: c.req.param('id'), productGroupId: sel.productGroupId, productId: sel.productId },
          })
        )
      )
    }
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

const schedulesSchema = z.object({
  taskSchedules: z.array(z.object({
    productId: z.string(),
    tier: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    price: z.number().min(0),
  })),
})

// Vendor can edit task schedules for a configurable plan subscription
app.put('/:id/schedules', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = schedulesSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const sub = await prisma.subscription.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!sub) return c.json({ error: 'Not found' }, 404)
    await prisma.subscriptionTaskSchedule.deleteMany({ where: { subscriptionId: c.req.param('id') } })
    if (parsed.data.taskSchedules.length > 0) {
      await prisma.$transaction(
        parsed.data.taskSchedules.map((ts) =>
          prisma.subscriptionTaskSchedule.create({
            data: { id: crypto.randomUUID(), subscriptionId: c.req.param('id'), productId: ts.productId, tier: ts.tier, price: ts.price },
          })
        )
      )
    }
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
