import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor, requireAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

// SQLite stores allowedTiers/pricePerTier as JSON strings — parse them before returning
function parseCp(cp: any) {
  return {
    ...cp,
    allowedTiers: typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers,
    pricePerTier: typeof cp.pricePerTier === 'string' ? JSON.parse(cp.pricePerTier) : cp.pricePerTier,
  }
}
function parsePlan(plan: any) {
  if (!plan) return plan
  return { ...plan, configurableProducts: plan.configurableProducts?.map(parseCp) }
}

const scheduleTierEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])
const selectionRuleEnum = z.enum(['ALL', 'CHOOSE_ONE', 'CHOOSE_N'])

const productGroupItemSchema = z.object({ productId: z.string(), sortOrder: z.number().int().default(0) })

const productGroupSchema = z.object({
  name: z.string().min(1),
  selectionRule: selectionRuleEnum,
  chooseN: z.number().int().optional(),
  sortOrder: z.number().int().default(0),
  items: z.array(productGroupItemSchema).min(1),
})

const planScheduleTierSchema = z.object({
  tier: scheduleTierEnum,
  price: z.number().min(0),
  productGroups: z.array(productGroupSchema).min(1),
})

const configurableProductSchema = z.object({
  productId: z.string(),
  allowedTiers: z.array(scheduleTierEnum).min(1),
  pricePerTier: z.record(z.number()).default({}),
})

const createPlanSchema = z.discriminatedUnion('planType', [
  z.object({
    planType: z.literal('FIXED'),
    name: z.string().min(1),
    description: z.string().optional(),
    scheduleTiers: z.array(planScheduleTierSchema).min(1),
  }),
  z.object({
    planType: z.literal('CONFIGURABLE'),
    name: z.string().min(1),
    description: z.string().optional(),
    configurableProducts: z.array(configurableProductSchema).min(1),
  }),
])

app.get('/', requireVendor, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plans = await prisma.plan.findMany({
      where: { vendorId: c.get('vendor').vendorId },
      include: {
        scheduleTiers: {
          include: { productGroups: { include: { items: { include: { product: true } } } } },
        },
        configurableProducts: { include: { product: true } },
        _count: { select: { subscriptions: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return c.json({ plans: plans.map(parsePlan) })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

function buildPlanOps(prisma: any, planId: string, vendorId: string, data: any) {
  const ops: any[] = [
    prisma.plan.create({ data: { id: planId, vendorId, name: data.name, description: data.description, planType: data.planType } }),
  ]
  if (data.planType === 'FIXED') {
    for (const st of data.scheduleTiers) {
      const tierId = crypto.randomUUID()
      ops.push(prisma.planScheduleTier.create({ data: { id: tierId, planId, tier: st.tier, price: st.price } }))
      for (const pg of st.productGroups) {
        const groupId = crypto.randomUUID()
        ops.push(prisma.productGroup.create({
          data: { id: groupId, planScheduleTierId: tierId, name: pg.name, selectionRule: pg.selectionRule, chooseN: pg.chooseN, sortOrder: pg.sortOrder },
        }))
        for (const item of pg.items) {
          ops.push(prisma.productGroupItem.create({ data: { id: crypto.randomUUID(), productGroupId: groupId, productId: item.productId, sortOrder: item.sortOrder } }))
        }
      }
    }
  } else {
    for (const cp of data.configurableProducts) {
      ops.push(prisma.configurablePlanProduct.create({
        data: { id: crypto.randomUUID(), planId, productId: cp.productId, allowedTiers: JSON.stringify(cp.allowedTiers), pricePerTier: JSON.stringify(cp.pricePerTier) },
      }))
    }
  }
  return ops
}

app.post('/', requireAdmin, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createPlanSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const data = parsed.data
    const vendorId = c.get('vendor').vendorId
    const prisma = getPrisma(c.env.DB)
    const planId = crypto.randomUUID()
    await prisma.$transaction(buildPlanOps(prisma, planId, vendorId, data))
    const fullPlan = await prisma.plan.findUnique({
      where: { id: planId },
      include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } },
    })
    return c.json({ plan: parsePlan(fullPlan) }, 201)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/:id', requireVendor, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findFirst({
      where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId },
      include: {
        scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } },
        configurableProducts: { include: { product: true } },
      },
    })
    if (!plan) return c.json({ error: 'Not found' }, 404)
    return c.json({ plan: parsePlan(plan) })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.put('/:id', requireAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!plan) return c.json({ error: 'Not found' }, 404)

    const body = await c.req.json()
    const parsed = createPlanSchema.safeParse({ ...body, planType: plan.planType })
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const data = parsed.data

    // D1 doesn't support interactive transactions — delete old data then batch-insert new
    if (data.planType === 'FIXED') {
      await prisma.planScheduleTier.deleteMany({ where: { planId: plan.id } })
    } else {
      await prisma.configurablePlanProduct.deleteMany({ where: { planId: plan.id } })
    }

    const updateOps: any[] = [
      prisma.plan.update({ where: { id: plan.id }, data: { name: data.name, description: data.description } }),
    ]
    if (data.planType === 'FIXED') {
      for (const st of data.scheduleTiers) {
        const tierId = crypto.randomUUID()
        updateOps.push(prisma.planScheduleTier.create({ data: { id: tierId, planId: plan.id, tier: st.tier, price: st.price } }))
        for (const pg of st.productGroups) {
          const groupId = crypto.randomUUID()
          updateOps.push(prisma.productGroup.create({
            data: { id: groupId, planScheduleTierId: tierId, name: pg.name, selectionRule: pg.selectionRule, chooseN: pg.chooseN, sortOrder: pg.sortOrder },
          }))
          for (const item of pg.items) {
            updateOps.push(prisma.productGroupItem.create({ data: { id: crypto.randomUUID(), productGroupId: groupId, productId: item.productId, sortOrder: item.sortOrder } }))
          }
        }
      }
    } else {
      for (const cp of data.configurableProducts) {
        updateOps.push(prisma.configurablePlanProduct.create({
          data: { id: crypto.randomUUID(), planId: plan.id, productId: cp.productId, allowedTiers: JSON.stringify(cp.allowedTiers), pricePerTier: JSON.stringify(cp.pricePerTier) },
        }))
      }
    }
    await prisma.$transaction(updateOps)

    const updated = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } },
    })
    return c.json({ plan: parsePlan(updated) })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

app.patch('/:id/activate', requireAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!plan) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.plan.update({ where: { id: c.req.param('id') }, data: { active: !plan.active } })
    return c.json({ plan: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.delete('/:id', requireAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!plan) return c.json({ error: 'Not found' }, 404)
    await prisma.plan.update({ where: { id: c.req.param('id') }, data: { active: false } })
    return c.json({ message: 'Plan deactivated' })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
