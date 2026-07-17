import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requirePlatformAdmin, signPlatformAdminToken } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Bootstrap: only works when no platform admins exist yet
app.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)

    const prisma = getPrisma(c.env.DB)
    const count = await prisma.platformAdmin.count()
    if (count > 0) return c.json({ error: 'Platform admin already exists. Use login.' }, 409)

    const { name, email, password } = parsed.data
    const passwordHash = await bcrypt.hash(password, 12)
    const admin = await prisma.platformAdmin.create({ data: { name, email, passwordHash } })
    const token = await signPlatformAdminToken({ adminId: admin.id, email: admin.email }, c.env.JWT_VENDOR_SECRET)
    return c.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)

    const prisma = getPrisma(c.env.DB)
    const admin = await prisma.platformAdmin.findUnique({ where: { email: parsed.data.email } })
    if (!admin || !(await bcrypt.compare(parsed.data.password, admin.passwordHash))) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    const token = await signPlatformAdminToken({ adminId: admin.id, email: admin.email }, c.env.JWT_VENDOR_SECRET)
    return c.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email } })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/me', requirePlatformAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const admin = await prisma.platformAdmin.findUnique({
      where: { id: c.get('platformAdmin').adminId },
      select: { id: true, name: true, email: true, createdAt: true },
    })
    if (!admin) return c.json({ error: 'Not found' }, 404)
    return c.json({ admin })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
