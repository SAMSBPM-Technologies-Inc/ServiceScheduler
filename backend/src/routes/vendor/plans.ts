import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireVendor)

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

app.get('/', async (c) => {
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

app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createPlanSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const data = parsed.data
    const vendorId = c.get('vendor').vendorId
    const prisma = getPrisma(c.env.DB)

    const plan = await prisma.$transaction(async (tx) => {
      const newPlan = await tx.plan.create({ data: { vendorId, name: data.name, description: data.description, planType: data.planType } })

      if (data.planType === 'FIXED') {
        for (const st of data.scheduleTiers) {
          const tier = await tx.planScheduleTier.create({ data: { planId: newPlan.id, tier: st.tier, price: st.price } })
          for (const pg of st.productGroups) {
            const group = await tx.productGroup.create({
              data: { planScheduleTierId: tier.id, name: pg.name, selectionRule: pg.selectionRule, chooseN: pg.chooseN, sortOrder: pg.sortOrder },
            })
            for (const item of pg.items) {
              await tx.productGroupItem.create({ data: { productGroupId: group.id, productId: item.productId, sortOrder: item.sortOrder } })
            }
          }
        }
      } else {
        for (const cp of data.configurableProducts) {
          await tx.configurablePlanProduct.create({
            data: {
              planId: newPlan.id,
              productId: cp.productId,
              allowedTiers: JSON.stringify(cp.allowedTiers),
              pricePerTier: JSON.stringify(cp.pricePerTier),
            },
          })
        }
      }
      return newPlan
    })

    const fullPlan = await prisma.plan.findUnique({
      where: { id: plan.id },
      include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } },
    })
    return c.json({ plan: parsePlan(fullPlan) }, 201)
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/:id', async (c) => {
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

app.put('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const plan = await prisma.plan.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!plan) return c.json({ error: 'Not found' }, 404)

    const body = await c.req.json()
    const parsed = createPlanSchema.safeParse({ ...body, planType: plan.planType })
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const data = parsed.data

    const updated = await prisma.$transaction(async (tx) => {
      await tx.plan.update({ where: { id: plan.id }, data: { name: data.name, description: data.description } })

      if (data.planType === 'FIXED') {
        // Delete existing tiers (cascade removes groups and items)
        await tx.planScheduleTier.deleteMany({ where: { planId: plan.id } })
        for (const st of data.scheduleTiers) {
          const tier = await tx.planScheduleTier.create({ data: { planId: plan.id, tier: st.tier, price: st.price } })
          for (const pg of st.productGroups) {
            const group = await tx.productGroup.create({
              data: { planScheduleTierId: tier.id, name: pg.name, selectionRule: pg.selectionRule, chooseN: pg.chooseN, sortOrder: pg.sortOrder },
            })
            for (const item of pg.items) {
              await tx.productGroupItem.create({ data: { productGroupId: group.id, productId: item.productId, sortOrder: item.sortOrder } })
            }
          }
        }
      } else {
        await tx.configurablePlanProduct.deleteMany({ where: { planId: plan.id } })
        for (const cp of data.configurableProducts) {
          await tx.configurablePlanProduct.create({
            data: { planId: plan.id, productId: cp.productId, allowedTiers: JSON.stringify(cp.allowedTiers), pricePerTier: JSON.stringify(cp.pricePerTier) },
          })
        }
      }

      return tx.plan.findUnique({
        where: { id: plan.id },
        include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } },
      })
    })

    return c.json({ plan: parsePlan(updated) })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

app.patch('/:id/activate', async (c) => {
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

app.delete('/:id', async (c) => {
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
