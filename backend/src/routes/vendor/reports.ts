import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireVendor } from '../../middleware/auth';

const router = Router();
router.use(requireVendor);

router.get('/dashboard', async (req, res) => {
  try {
    const vendorId = req.vendor!.vendorId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      activeCount,
      pausedCount,
      cancelledCount,
      revenueResult,
      planCounts,
      recentPayments,
      upcomingRenewals,
    ] = await Promise.all([
      prisma.subscription.count({ where: { vendorId, status: 'ACTIVE' } }),
      prisma.subscription.count({ where: { vendorId, status: 'PAUSED' } }),
      prisma.subscription.count({ where: { vendorId, status: 'CANCELLED' } }),
      prisma.payment.aggregate({ where: { vendorId, status: 'PAID' }, _sum: { amount: true } }),
      prisma.subscription.groupBy({
        by: ['planId'],
        where: { vendorId, status: 'ACTIVE' },
        _count: true,
      }),
      prisma.payment.findMany({
        where: { vendorId, createdAt: { gte: thirtyDaysAgo } },
        include: { subscription: { select: { plan: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.subscription.findMany({
        where: { vendorId, status: 'ACTIVE' },
        include: { customer: { select: { name: true, email: true } }, plan: { select: { name: true } } },
        orderBy: { startDate: 'asc' },
        take: 10,
      }),
    ]);

    // Enrich plan counts with plan names
    const planIds = planCounts.map((p) => p.planId);
    const plans = await prisma.plan.findMany({ where: { id: { in: planIds } }, select: { id: true, name: true } });
    const planMap = Object.fromEntries(plans.map((p) => [p.id, p.name]));

    res.json({
      subscriptions: { active: activeCount, paused: pausedCount, cancelled: cancelledCount },
      totalRevenue: revenueResult._sum.amount || 0,
      topPlans: planCounts.map((pc) => ({ planId: pc.planId, name: planMap[pc.planId], count: pc._count })).sort((a, b) => b.count - a.count),
      recentPayments,
      upcomingRenewals,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const vendorId = req.vendor!.vendorId;
    const { period = '30d' } = req.query;
    const days = period === '90d' ? 90 : period === '7d' ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const payments = await prisma.payment.findMany({
      where: { vendorId, status: 'PAID', paidAt: { gte: since } },
      orderBy: { paidAt: 'asc' },
    });

    // Group by day
    const byDay: Record<string, number> = {};
    for (const p of payments) {
      const day = p.paidAt!.toISOString().slice(0, 10);
      byDay[day] = (byDay[day] || 0) + Number(p.amount);
    }
    res.json({ revenue: Object.entries(byDay).map(([date, amount]) => ({ date, amount })) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/subscriptions', async (req, res) => {
  try {
    const vendorId = req.vendor!.vendorId;
    const subscriptions = await prisma.subscription.findMany({
      where: { vendorId },
      include: { customer: true, plan: true },
    });
    const csv = [
      'ID,Customer,Email,Plan,Status,Start Date',
      ...subscriptions.map((s) => `${s.id},${s.customer.name},${s.customer.email},${s.plan.name},${s.status},${s.startDate.toISOString().slice(0, 10)}`),
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscriptions.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
