import type { Hono } from 'hono'

export type Env = {
  DB: D1Database
  JWT_VENDOR_SECRET: string
  JWT_CUSTOMER_SECRET: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  FRONTEND_URL: string
  ENCRYPTION_KEY?: string // AES-256 key for encrypting Stripe keys at rest (base64, 32 bytes). Set via: wrangler secret put ENCRYPTION_KEY
}

export type VendorPayload = { type: 'vendor'; vendorId: string; email: string; role: 'ADMIN' | 'WORKER'; userId?: string }
export type CustomerPayload = { type: 'customer'; customerId: string; email: string }
export type PlatformAdminPayload = { type: 'platform_admin'; adminId: string; email: string }

export type Variables = {
  vendor: VendorPayload
  customer: CustomerPayload
  platformAdmin: PlatformAdminPayload
}

export type AppType = { Bindings: Env; Variables: Variables }
