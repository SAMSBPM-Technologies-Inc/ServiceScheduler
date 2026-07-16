import { Hono } from 'hono'
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
        plan: { include: { scheduleTiers: { include: { productGroups: { include: { items: { include: { product: true } } } } } }, configurableProducts: { include: { product: true } } } },
        selections: { include: { productGroup: { include: { items: { include: { product: true } } } } } },
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

export default app
