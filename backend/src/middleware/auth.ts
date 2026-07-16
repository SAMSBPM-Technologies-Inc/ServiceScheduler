import { createMiddleware } from 'hono/factory'
import { verifyToken, signToken } from '../lib/jwt'
import type { AppType, VendorPayload, CustomerPayload } from '../types'

export const requireVendor = createMiddleware<AppType>(async (c, next) => {
  const auth = c.req.header('Authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verifyToken(token, c.env.JWT_VENDOR_SECRET)
    if (payload.type !== 'vendor') return c.json({ error: 'Unauthorized' }, 401)
    c.set('vendor', payload as unknown as VendorPayload)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export const requireCustomer = createMiddleware<AppType>(async (c, next) => {
  const auth = c.req.header('Authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) return c.json({ error: 'Unauthorized' }, 401)
  try {
    const payload = await verifyToken(token, c.env.JWT_CUSTOMER_SECRET)
    if (payload.type !== 'customer') return c.json({ error: 'Unauthorized' }, 401)
    c.set('customer', payload as unknown as CustomerPayload)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})

export async function signVendorToken(payload: Omit<VendorPayload, 'type'>, secret: string): Promise<string> {
  return signToken({ ...payload, type: 'vendor' }, secret)
}

export async function signCustomerToken(payload: Omit<CustomerPayload, 'type'>, secret: string): Promise<string> {
  return signToken({ ...payload, type: 'customer' }, secret)
}
