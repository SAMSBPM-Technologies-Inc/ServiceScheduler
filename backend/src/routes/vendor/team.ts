import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()
app.use('*', requireAdmin)

const memberSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'WORKER']),
  active: z.boolean().default(true),
})

app.get('/', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const members = await prisma.vendorUser.findMany({
      where: { vendorId: c.get('vendor').vendorId },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    return c.json({ members })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = memberSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    if (!parsed.data.password) return c.json({ error: 'Password is required for new members' }, 400)
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.vendorUser.findUnique({ where: { email: parsed.data.email } })
    if (existing) return c.json({ error: 'Email already in use' }, 409)
    const passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const member = await prisma.vendorUser.create({
      data: {
        vendorId: c.get('vendor').vendorId,
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
        active: parsed.data.active,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    return c.json({ member }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.put('/:id', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = memberSchema.partial().safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.vendorUser.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!existing) return c.json({ error: 'Not found' }, 404)
    const updateData: any = {}
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name
    if (parsed.data.email !== undefined) updateData.email = parsed.data.email
    if (parsed.data.role !== undefined) updateData.role = parsed.data.role
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active
    if (parsed.data.password) updateData.passwordHash = await bcrypt.hash(parsed.data.password, 12)
    const member = await prisma.vendorUser.update({
      where: { id: c.req.param('id') },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    return c.json({ member })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.delete('/:id', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.vendorUser.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!existing) return c.json({ error: 'Not found' }, 404)
    await prisma.vendorUser.delete({ where: { id: c.req.param('id') } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
