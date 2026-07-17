import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppType } from './types'

import vendorAuthRouter from './routes/vendor/auth'
import vendorTeamRouter from './routes/vendor/team'
import vendorProductsRouter from './routes/vendor/products'
import vendorPlansRouter from './routes/vendor/plans'
import vendorSubscriptionsRouter from './routes/vendor/subscriptions'
import vendorAlertsRouter from './routes/vendor/alerts'
import vendorReportsRouter from './routes/vendor/reports'
import customerAuthRouter from './routes/customer/auth'
import portalRouter from './routes/customer/portal'
import customerSubscriptionsRouter from './routes/customer/subscriptions'
import paymentsRouter from './routes/payments'

const app = new Hono<AppType>()

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }))

app.route('/api/vendor/auth', vendorAuthRouter)
app.route('/api/vendor/team', vendorTeamRouter)
app.route('/api/vendor/products', vendorProductsRouter)
app.route('/api/vendor/plans', vendorPlansRouter)
app.route('/api/vendor/subscriptions', vendorSubscriptionsRouter)
app.route('/api/vendor/alerts', vendorAlertsRouter)
app.route('/api/vendor/reports', vendorReportsRouter)
app.route('/api/customer/auth', customerAuthRouter)
app.route('/api/portal', portalRouter)
app.route('/api/customer/subscriptions', customerSubscriptionsRouter)
app.route('/api/payments', paymentsRouter)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

export default app
