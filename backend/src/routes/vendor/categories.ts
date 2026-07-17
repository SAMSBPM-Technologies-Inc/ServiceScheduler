import { Hono } from 'hono'
import { z } from 'zod'
import { getPrisma } from '../../lib/db'
import { requireVendor, requireAdmin } from '../../middleware/auth'
import type { AppType } from '../../types'

const app = new Hono<AppType>()

// GET /  — list all categories with their sub-categories
app.get('/', requireVendor, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const categories = await prisma.productCategory.findMany({
      where: { vendorId: c.get('vendor').vendorId },
      include: { subCategories: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    })
    return c.json({ categories })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// POST /  — create a category
app.post('/', requireAdmin, async (c) => {
  try {
    const { name } = await c.req.json()
    if (!name?.trim()) return c.json({ error: 'name required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const vendorId = c.get('vendor').vendorId
    const existing = await prisma.productCategory.findFirst({ where: { vendorId, name: name.trim() } })
    if (existing) return c.json({ error: 'Category already exists' }, 409)
    const count = await prisma.productCategory.count({ where: { vendorId } })
    const category = await prisma.productCategory.create({
      data: { id: crypto.randomUUID(), vendorId, name: name.trim(), sortOrder: count },
      include: { subCategories: true },
    })
    return c.json({ category }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// PUT /:id  — rename a category
app.put('/:id', requireAdmin, async (c) => {
  try {
    const { name } = await c.req.json()
    if (!name?.trim()) return c.json({ error: 'name required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const vendorId = c.get('vendor').vendorId
    const cat = await prisma.productCategory.findFirst({ where: { id: c.req.param('id'), vendorId } })
    if (!cat) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.productCategory.update({
      where: { id: cat.id },
      data: { name: name.trim() },
      include: { subCategories: { orderBy: { sortOrder: 'asc' } } },
    })
    return c.json({ category: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// DELETE /:id  — delete a category (cascades to sub-categories)
app.delete('/:id', requireAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const cat = await prisma.productCategory.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!cat) return c.json({ error: 'Not found' }, 404)
    await prisma.productCategory.delete({ where: { id: cat.id } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// POST /:id/subcategories  — add a sub-category
app.post('/:id/subcategories', requireAdmin, async (c) => {
  try {
    const { name } = await c.req.json()
    if (!name?.trim()) return c.json({ error: 'name required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const cat = await prisma.productCategory.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!cat) return c.json({ error: 'Not found' }, 404)
    const existing = await prisma.productSubCategory.findFirst({ where: { categoryId: cat.id, name: name.trim() } })
    if (existing) return c.json({ error: 'Sub-category already exists' }, 409)
    const count = await prisma.productSubCategory.count({ where: { categoryId: cat.id } })
    const sub = await prisma.productSubCategory.create({
      data: { id: crypto.randomUUID(), categoryId: cat.id, name: name.trim(), sortOrder: count },
    })
    return c.json({ subCategory: sub }, 201)
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// PUT /:id/subcategories/:subId  — rename a sub-category
app.put('/:id/subcategories/:subId', requireAdmin, async (c) => {
  try {
    const { name } = await c.req.json()
    if (!name?.trim()) return c.json({ error: 'name required' }, 400)
    const prisma = getPrisma(c.env.DB)
    const cat = await prisma.productCategory.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!cat) return c.json({ error: 'Not found' }, 404)
    const sub = await prisma.productSubCategory.findFirst({ where: { id: c.req.param('subId'), categoryId: cat.id } })
    if (!sub) return c.json({ error: 'Not found' }, 404)
    const updated = await prisma.productSubCategory.update({ where: { id: sub.id }, data: { name: name.trim() } })
    return c.json({ subCategory: updated })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

// DELETE /:id/subcategories/:subId  — delete a sub-category
app.delete('/:id/subcategories/:subId', requireAdmin, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const cat = await prisma.productCategory.findFirst({ where: { id: c.req.param('id'), vendorId: c.get('vendor').vendorId } })
    if (!cat) return c.json({ error: 'Not found' }, 404)
    const sub = await prisma.productSubCategory.findFirst({ where: { id: c.req.param('subId'), categoryId: cat.id } })
    if (!sub) return c.json({ error: 'Not found' }, 404)
    await prisma.productSubCategory.delete({ where: { id: sub.id } })
    return c.json({ ok: true })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
