import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { requireCustomer } from '../middleware/auth';
import { config } from '../config';
import { validate } from '../middleware/validate';

const router = Router();
const stripe = new Stripe(config.stripeSecretKey, { apiVersion: '2023-10-16' });

const createCheckoutSchema = z.object({
  paymentId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

router.post('/checkout', requireCustomer, validate(createCheckoutSchema), async (req: Request, res: Response) => {
  try {
    const { paymentId, successUrl, cancelUrl } = req.body;
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, customerId: req.customer!.customerId, status: 'PENDING' },
      include: { subscription: { include: { plan: true, vendor: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

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
    });

    await prisma.payment.update({ where: { id: paymentId }, data: { stripeCheckoutSessionId: session.id } });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).json({ error: 'No signature' });
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, config.stripeWebhookSecret);
  } catch (err) {
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession;
    const paymentId = session.metadata?.paymentId;
    if (paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'PAID', paidAt: new Date(), stripePaymentIntentId: session.payment_intent as string },
      });
    }
  }

  res.json({ received: true });
});

router.get('/history', requireCustomer, async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { customerId: req.customer!.customerId },
      include: { subscription: { include: { plan: { select: { name: true } }, vendor: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
