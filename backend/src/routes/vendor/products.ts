import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireVendor)

const productSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  weight: z.string().optional(),
  description: z.string().optional(),
  footnote: z.string().optional(),
  alertNote: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  active: z.boolean().default(true),
})

app.get('/', async (c) => {
  try {
    const { category, search, active } = c.req.query()
    const where: any = { vendorId: c.get('vendor').vendorId }
    if (category) where.category = category
    if (active !== undefined) where.active = active === 'true'
    if (search) where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
    ]
    const prisma = getPrisma(c.env.DB)
    const products = await prisma.product.findMany({ where, orderBy: [{ category: 'asc' }, { name: 'asc' }] })
    return c.json({ products })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const vendorId = c.get('vendor').vendorId
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.product.findUnique({ where: { vendorId_code: { vendorId, code: parsed.data.code } } })
    if (existing) return c.json({ error: 'Product code already exists' }, 409)
    const product = await prisma.product.create({ data: { ...parsed.data, vendorId } })
    return c.json({ product }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const product = await prisma.product.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!product) return c.json({ error: 'Not found' }, 404)
    return c.json({ product })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.put('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = productSchema.partial().safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const vendorId = c.get('vendor').vendorId
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.product.findFirst({ where: { id: c.req.param('id'), vendorId } })
    if (!existing) return c.json({ error: 'Not found' }, 404)
    if (parsed.data.code && parsed.data.code !== existing.code) {
      const codeConflict = await prisma.product.findUnique({ where: { vendorId_code: { vendorId, code: parsed.data.code } } })
      if (codeConflict) return c.json({ error: 'Product code already exists' }, 409)
    }
    const product = await prisma.product.update({ where: { id: c.req.param('id') }, data: parsed.data })
    return c.json({ product })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.delete('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.product.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!existing) return c.json({ error: 'Not found' }, 404)
    await prisma.product.update({ where: { id: c.req.param('id') }, data: { active: false } })
    return c.json({ message: 'Product archived' })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
