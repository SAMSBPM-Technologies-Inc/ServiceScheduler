import { Hono } from 'hono'
import { getPrisma } from '../../lib/db'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

// Look up vendor by custom domain (used by frontend on boot to detect custom-domain mode)
app.get('/by-domain', async (c) => {
  try {
    const domain = c.req.query('domain')?.trim().toLowerCase()
    if (!domain) return c.json({ error: 'domain required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({
      where: { customDomain: domain },
      select: { id: true, name: true, slug: true, logoUrl: true, customDomain: true },
    })
    if (!vendor) return c.json({ error: 'No vendor for this domain' }, 404)
    return c.json({ vendor })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/vendor/:slug', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({
      where: { slug: c.req.param('slug') },
      select: { id: true, name: true, slug: true, logoUrl: true },
    })
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404)
    return c.json({ vendor })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

app.get('/vendor/:slug/plans', async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const vendor = await prisma.vendor.findUnique({ where: { slug: c.req.param('slug') } })
    if (!vendor) return c.json({ error: 'Vendor not found' }, 404)
    const plans = await prisma.plan.findMany({
      where: { vendorId: vendor.id, active: true },
      include: {
        scheduleTiers: { include: { productGroups: { include: { items: { include: { product: { select: { id: true, name: true, code: true, description: true, price: true } } } } } } } },
        configurableProducts: { include: { product: { select: { id: true, name: true, code: true, category: true, description: true } } } },
      },
    })
    const parsed = plans.map((plan) => ({
      ...plan,
      configurableProducts: plan.configurableProducts.map((cp) => ({
        ...cp,
        allowedTiers: typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers,
        pricePerTier: typeof cp.pricePerTier === 'string' ? JSON.parse(cp.pricePerTier) : cp.pricePerTier,
      })),
    }))
    return c.json({ plans: parsed })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
