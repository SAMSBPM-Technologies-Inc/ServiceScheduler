import express from 'express';
import cors from 'cors';
import { config } from './config';

// Routes
import vendorAuthRouter from './routes/vendor/auth';
import vendorProductsRouter from './routes/vendor/products';
import vendorPlansRouter from './routes/vendor/plans';
import vendorSubscriptionsRouter from './routes/vendor/subscriptions';
import vendorAlertsRouter from './routes/vendor/alerts';
import vendorReportsRouter from './routes/vendor/reports';
import customerAuthRouter from './routes/customer/auth';
import portalRouter from './routes/customer/portal';
import customerSubscriptionsRouter from './routes/customer/subscriptions';
import paymentsRouter from './routes/payments';

const app = express();

app.use(cors({ origin: config.frontendUrl, credentials: true }));

// Stripe webhook needs raw body
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Vendor routes
app.use('/api/vendor/auth', vendorAuthRouter);
app.use('/api/vendor/products', vendorProductsRouter);
app.use('/api/vendor/plans', vendorPlansRouter);
app.use('/api/vendor/subscriptions', vendorSubscriptionsRouter);
app.use('/api/vendor/alerts', vendorAlertsRouter);
app.use('/api/vendor/reports', vendorReportsRouter);

// Customer routes
app.use('/api/customer/auth', customerAuthRouter);
app.use('/api/portal', portalRouter);
app.use('/api/customer/subscriptions', customerSubscriptionsRouter);
app.use('/api/payments', paymentsRouter);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

export default app;
