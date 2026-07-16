import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000'),
  jwtVendorSecret: process.env.JWT_VENDOR_SECRET || 'dev-vendor-secret',
  jwtCustomerSecret: process.env.JWT_CUSTOMER_SECRET || 'dev-customer-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
