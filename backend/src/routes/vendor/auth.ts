import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { signVendorToken, requireVendor, requireAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

app.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const { name, email, password, slug } = parsed.data
    const prisma = getPrisma(c.env.DB)
    const existing = await prisma.vendor.findFirst({ where: { OR: [{ email }, { slug }] } })
    if (existing) {
      return c.json({ error: existing.email === email ? 'Email already in use' : 'Slug already taken' }, 409)
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const vendor = await prisma.vendor.create({ data: { name, email, passwordHash, slug } })
    const token = await signVendorToken({ vendorId: vendor.id, email: vendor.email, role: 'ADMIN' }, c.env.JWT_VENDOR_SECRET)
    return c.json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, slug: vendor.slug }, role: 'ADMIN' }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const { email, password } = parsed.data
    const prisma = getPrisma(c.env.DB)

    // Check VendorUser (team member) first
    const vendorUser = await prisma.vendorUser.findUnique({ where: { email } })
    if (vendorUser) {
      if (!vendorUser.active) return c.json({ error: 'Account is inactive' }, 401)
      if (!(await bcrypt.compare(password, vendorUser.passwordHash))) {
        return c.json({ error: 'Invalid credentials' }, 401)
      }
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorUser.vendorId } })
      if (!vendor) return c.json({ error: 'Vendor not found' }, 404)
      const token = await signVendorToken(
        { vendorId: vendor.id, email: vendorUser.email, role: vendorUser.role as 'ADMIN' | 'WORKER', userId: vendorUser.id },
        c.env.JWT_VENDOR_SECRET,
      )
      return c.json({
        token,
        vendor: { id: vendor.id, name: vendor.name, email: vendor.email, slug: vendor.slug, logoUrl: vendor.logoUrl },
        role: vendorUser.role,
      })
    }

    // Fall back to Vendor owner login (always ADMIN)
    const vendor = await prisma.vendor.findUnique({ where: { email } })
    if (!vendor || !(await bcrypt.compare(password, vendor.passwordHash))) {
      return c.json({ error: 'Invalid credentials' }, 401)
    }
    const token = await signVendorToken({ vendorId: vendor.id, email: vendor.email, role: 'ADMIN' }, c.env.JWT_VENDOR_SECRET)
    return c.json({ token, vendor: { id: vendor.id, name: vendor.name, email: vendor.email, slug: vendor.slug, logoUrl: vendor.logoUrl }, role: 'ADMIN' })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/me', requireVendor, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({
      where: { id: c.get('vendor').vendorId },
      select: { id: true, name: true, email: true, slug: true, logoUrl: true, customDomain: true, createdAt: true },
    })
    if (!vendor) return c.json({ error: 'Not found' }, 404)
    return c.json({ vendor, role: c.get('vendor').role })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.put('/domain', requireAdmin, async (c) => {
  try {
    const body = await c.req.json()
    const customDomain = (body.customDomain as string | null | undefined)?.trim().toLowerCase() || null
    const prisma = getPrisma(c.env.DB)
    if (customDomain) {
      const existing = await prisma.vendor.findFirst({ where: { customDomain, NOT: { id: c.get('vendor').vendorId } } })
      if (existing) return c.json({ error: 'Domain already in use by another vendor' }, 409)
    }
    await prisma.vendor.update({ where: { id: c.get('vendor').vendorId }, data: { customDomain } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

const stripeSchema = z.object({
  stripeSecretKey: z.string().min(1).optional().or(z.literal('')),
  stripeWebhookSecret: z.string().min(1).optional().or(z.literal('')),
})

app.put('/stripe', requireAdmin, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = stripeSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const prisma = getPrisma(c.env.DB)
    await prisma.vendor.update({
      where: { id: c.get('vendor').vendorId },
      data: {
        stripeSecretKey: parsed.data.stripeSecretKey || null,
        stripeWebhookSecret: parsed.data.stripeWebhookSecret || null,
      },
    })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// Return whether vendor has Stripe configured (without exposing the keys)
app.get('/stripe', requireVendor, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({
      where: { id: c.get('vendor').vendorId },
      select: { stripeSecretKey: true, stripeWebhookSecret: true },
    })
    if (!vendor) return c.json({ error: 'Not found' }, 404)
    return c.json({
      hasStripeKey: !!vendor.stripeSecretKey,
      hasWebhookSecret: !!vendor.stripeWebhookSecret,
    })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
