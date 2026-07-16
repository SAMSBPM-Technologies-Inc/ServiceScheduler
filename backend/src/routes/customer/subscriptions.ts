import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireCustomer } from '../../middleware/auth'
import { validatePlanSelection } from '../../services/planSelection'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireCustomer)

const scheduleTierEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])

const subscribeFixedSchema = z.object({
  planId: z.string(),
  selectedTier: scheduleTierEnum,
  selections: z.array(z.object({ productGroupId: z.string(), productId: z.string() })).default([]),
})

const subscribeConfigurableSchema = z.object({
  planId: z.string(),
  taskSchedules: z.array(z.object({ productId: z.string(), tier: scheduleTierEnum, price: z.number().min(0) })).min(1),
})

app.get('/', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const subscriptions = await prisma.subscription.findMany({
      where: { customerId: c.get('customer').customerId },
      include: {
        plan: { select: { id: true, name: true, planType: true } },
        vendor: { select: { id: true, name: true, slug: true } },
        selections: { include: { productGroup: { select: { name: true } } } },
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

app.post('/fixed', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = subscribeFixedSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const customerId = c.get('customer').customerId
    const { planId, selectedTier, selections } = parsed.data

    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { scheduleTiers: { include: { productGroups: { include: { items: true } } } } },
    })
    if (!plan || !plan.active) return c.json({ error: 'Plan not found or inactive' }, 404)
    if (plan.planType !== 'FIXED') return c.json({ error: 'Use /configurable for configurable plans' }, 400)

    const validation = validatePlanSelection(plan, selectedTier, selections)
    if (!validation.valid) return c.json({ error: validation.error }, 400)

    const tierRecord = plan.scheduleTiers.find((t) => t.tier === selectedTier)
    if (!tierRecord) return c.json({ error: 'Invalid tier' }, 400)

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({
        data: { customerId, planId, vendorId: plan.vendorId, selectedTier, status: 'ACTIVE' },
      })
      for (const sel of selections) {
        await tx.subscriptionSelection.create({ data: { subscriptionId: sub.id, productGroupId: sel.productGroupId, productId: sel.productId } })
      }
      // Create a pending payment
      await tx.payment.create({
        data: {
          subscriptionId: sub.id, customerId, vendorId: plan.vendorId,
          amount: tierRecord.price, currency: 'usd',
          billingPeriod: new Date().toISOString().slice(0, 7), status: 'PENDING',
        },
      })
      return sub
    })

    return c.json({ subscription }, 201)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/configurable', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = subscribeConfigurableSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const customerId = c.get('customer').customerId
    const { planId, taskSchedules } = parsed.data

    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { configurableProducts: true },
    })
    if (!plan || !plan.active) return c.json({ error: 'Plan not found or inactive' }, 404)
    if (plan.planType !== 'CONFIGURABLE') return c.json({ error: 'Use /fixed for fixed plans' }, 400)

    // Validate each task/tier combo is allowed
    for (const ts of taskSchedules) {
      const cp = plan.configurableProducts.find((p) => p.productId === ts.productId)
      if (!cp) return c.json({ error: `Product ${ts.productId} not in plan` }, 400)
      const allowedTiers = (typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers) as string[]
      if (!allowedTiers.includes(ts.tier)) return c.json({ error: `Tier ${ts.tier} not allowed for product ${ts.productId}` }, 400)
    }

    const totalAmount = taskSchedules.reduce((sum: number, ts: any) => sum + ts.price, 0)

    const subscription = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.create({ data: { customerId, planId, vendorId: plan.vendorId, status: 'ACTIVE' } })
      for (const ts of taskSchedules) {
        await tx.subscriptionTaskSchedule.create({ data: { subscriptionId: sub.id, productId: ts.productId, tier: ts.tier, price: ts.price } })
      }
      await tx.payment.create({
        data: {
          subscriptionId: sub.id, customerId, vendorId: plan.vendorId,
          amount: totalAmount, currency: 'usd',
          billingPeriod: new Date().toISOString().slice(0, 7), status: 'PENDING',
        },
      })
      return sub
    })

    return c.json({ subscription }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const subscription = await prisma.subscription.findFirst({
      where: { id: c.req.param('id'), customerId: c.get('customer').customerId },
      include: {
        plan: { include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } } },
        vendor: { select: { id: true, name: true, slug: true } },
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

app.patch('/:id/status', async (c) => {
  try {
    const body = await c.req.json()
    const { status } = body
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) return c.json({ error: 'Invalid status' }, 400)
    const prisma = getPrisma(c.env.DB)
    const subscription = await prisma.subscription.findFirst({ where: { id: c.req.param('id'), customerId: c.get('customer').customerId } })
    if (!subscription) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.subscription.update({ where: { id: c.req.param('id') }, data: { status, endDate: status === 'CANCELLED' ? new Date() : null } })
    return c.json({ subscription: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// Instructions
app.put('/:id/instructions', async (c) => {
  try {
    const body = await c.req.json()
    const { text } = body
    if (!text) return c.json({ error: 'text required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const subscription = await prisma.subscription.findFirst({ where: { id: c.req.param('id'), customerId: c.get('customer').customerId } })
    if (!subscription) return c.json({ error: 'Not found' }, 404)
    // Upsert: delete all old, create new
    await prisma.instruction.deleteMany({ where: { subscriptionId: c.req.param('id') } })
    const instruction = await prisma.instruction.create({ data: { subscriptionId: c.req.param('id'), text } })
    return c.json({ instruction })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
