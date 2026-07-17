import { Hono } from 'hono'
import { z } from 'zod'
import Stripe from 'stripe'
import { getPrisma } from '../lib/db'
import { requireCustomer } from '../middleware/auth'
import { maybeDecrypt } from '../lib/encryption'
import type { AppType } from '../types'

const app = new Hono<AppType>()

const createCheckoutSchema = z.object({
  paymentId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

app.post('/checkout', requireCustomer, async (c) => {
  try {
    const body = await c.req.json()
    const parsed = createCheckoutSchema.safeParse(body)
    if (!parsed.success) return c.json({ error: 'Validation error', issues: parsed.error.issues }, 400)
    const { paymentId, successUrl, cancelUrl } = parsed.data
    const prisma = getPrisma(c.env.DB)
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, customerId: c.get('customer').customerId, status: 'PENDING' },
      include: { subscription: { include: { plan: true, vendor: { select: { name: true, stripeSecretKey: true } } } } },
    })
    if (!payment) return c.json({ error: 'Payment not found' }, 404)

    // Use vendor's own Stripe key if configured, else fall back to platform key
    const vendorStripeKey = await maybeDecrypt(payment.subscription.vendor.stripeSecretKey, c.env.ENCRYPTION_KEY)
    const stripeKey = vendorStripeKey || c.env.STRIPE_SECRET_KEY
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: payment.currency,
          product_data: { name: `${payment.subscription.vendor.name} - ${payment.subscription.plan.name} (${payment.billingPeriod})` },
          unit_amount: Math.round(Number(payment.amount) * 100),
        },
        quantity: 1,
      }],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: { paymentId: payment.id },
    })

    await prisma.payment.update({ where: { id: paymentId }, data: { stripeCheckoutSessionId: session.id } })
    return c.json({ url: session.url })
  } catch (err) {
    console.error(err)
    return c.json({ error: 'Server error' }, 500)
  }
})

async function handleWebhookEvent(event: Stripe.Event, db: D1Database) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const paymentId = session.metadata?.paymentId
    if (paymentId) {
      const prisma = getPrisma(db)
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: new Date(), stripePaymentIntentId: session.payment_intent as string },
      })
    }
  }
}

// Vendor-specific webhook: POST /webhook/:vendorId
// Vendors configure this full URL in their Stripe dashboard so we know which keys to use
app.post('/webhook/:vendorId', async (c) => {
  const rawBody = await c.req.text()
  const sig = c.req.header('stripe-signature')
  if (!sig) return c.json({ error: 'No signature' }, 400)
  const prisma = getPrisma(c.env.DB)
  const vendor = await prisma.vendor.findUnique({
    where: { id: c.req.param('vendorId') },
    select: { stripeSecretKey: true, stripeWebhookSecret: true },
  })
  if (!vendor) return c.json({ error: 'Vendor not found' }, 404)
  const vendorStripeKey = await maybeDecrypt(vendor.stripeSecretKey, c.env.ENCRYPTION_KEY)
  const vendorWebhookSecret = await maybeDecrypt(vendor.stripeWebhookSecret, c.env.ENCRYPTION_KEY)
  const stripeKey = vendorStripeKey || c.env.STRIPE_SECRET_KEY
  const webhookSecret = vendorWebhookSecret || c.env.STRIPE_WEBHOOK_SECRET
  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    return c.json({ error: 'Webhook signature verification failed' }, 400)
  }
  await handleWebhookEvent(event, c.env.DB)
  return c.json({ received: true })
})

// Legacy webhook path (uses global platform keys)
app.post('/webhook', async (c) => {
  const rawBody = await c.req.text()
  const sig = c.req.header('stripe-signature')
  if (!sig) return c.json({ error: 'No signature' }, 400)
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return c.json({ error: 'Webhook signature verification failed' }, 400)
  }
  await handleWebhookEvent(event, c.env.DB)
  return c.json({ received: true })
})

app.get('/history', requireCustomer, async (c) => {
  try {
    const prisma = getPrisma(c.env.DB)
    const payments = await prisma.payment.findMany({
      where: { customerId: c.get('customer').customerId },
      include: { subscription: { include: { plan: { select: { name: true } }, vendor: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    return c.json({ payments })
  } catch (err) {
    return c.json({ error: 'Server error' }, 500)
  }
})

export default app
