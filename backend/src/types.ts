import type { Hono } from 'hono'

export type Env = {
  DB: D1Database
  JWT_VENDOR_SECRET: string
  JWT_CUSTOMER_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  FRONTEND_URL: string
}

export type VendorPayload = { type: 'vendor'; vendorId: string; email: string }
export type CustomerPayload = { type: 'customer'; customerId: string; email: string }

export type Variables = {
  vendor: VendorPayload
  customer: CustomerPayload
}

export type AppType = { Bindings: Env; Variables: Variables }
