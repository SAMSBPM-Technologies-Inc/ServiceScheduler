import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireVendor)

const alertRuleSchema = z.object({
  name: z.string().min(1),
  trigger: z.enum(['DAYS_BEFORE_RENEWAL', 'PRODUCT_OUT_OF_STOCK', 'MANUAL']),
  daysOffset: z.number().int().optional(),
  productId: z.string().optional(),
  message: z.string().min(1),
  active: z.boolean().default(true),
})

// Alert rules CRUD
app.get('/rules', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const rules = await prisma.alertRule.findMany({ where: { vendorId: c.get('vendor').vendorId }, orderBy: { createdAt: 'desc' } })
    return c.json({ rules })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/rules', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = alertRuleSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const rule = await prisma.alertRule.create({ data: { ...parsed.data, vendorId: c.get('vendor').vendorId } })
    return c.json({ rule }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.put('/rules/:id', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = alertRuleSchema.partial().safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const rule = await prisma.alertRule.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!rule) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.alertRule.update({ where: { id: c.req.param('id') }, data: parsed.data })
    return c.json({ rule: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.delete('/rules/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const rule = await prisma.alertRule.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!rule) return c.json({ error: 'Not found' }, 404)
    await prisma.alertRule.delete({ where: { id: c.req.param('id') } })
    return c.json({ message: 'Deleted' })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// Alert log
app.get('/', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const alerts = await prisma.alert.findMany({
      where: { vendorId: c.get('vendor').vendorId },
      include: { subscription: { select: { id: true, customer: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return c.json({ alerts })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.patch('/:id/read', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const alert = await prisma.alert.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!alert) return c.json({ error: 'Not found' }, 404)
    await prisma.alert.update({ where: { id: c.req.param('id') }, data: { read: true } })
    return c.json({ message: 'Marked as read' })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// Manual alert creation
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { message, subscriptionId, type } = body
    const prisma = getPrisma(c.env.DB)
    const alert = await prisma.alert.create({
      data: { vendorId: c.get('vendor').vendorId, message, subscriptionId, type: type || 'CUSTOM' },
    })
    return c.json({ alert }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
