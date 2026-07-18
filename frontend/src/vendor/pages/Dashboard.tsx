import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Users, DollarSign, Package, Bell } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: () => vendorApi.get('/vendor/reports/dashboard').then(r => r.data),
  })
  const { data: revenue } = useQuery({
    queryKey: ['vendor-revenue'],
    queryFn: () => vendorApi.get('/vendor/reports/revenue?period=30d').then(r => r.data.revenue),
  })

  if (isLoading) return <div className="p-8 text-gray-500">Loading...</div>

  const stats = [
    { label: 'Active Subscriptions', value: data?.subscriptions?.active ?? 0, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Paused', value: data?.subscriptions?.paused ?? 0, icon: Package, color: 'text-yellow-600 bg-yellow-50' },
    { label: 'Total Revenue', value: `$${Number(data?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
    { label: 'Cancelled', value: data?.subscriptions?.cancelled ?? 0, icon: Bell, color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}><Icon size={22} /></div>
            <div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
          </div>
        ))}
      </div>

      {revenue && revenue.length > 0 && (
        <div className="card mb-8">
          <h2 className="font-semibold mb-4">Revenue (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenue}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#dbeafe" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-4">Top Plans</h2>
          {data?.topPlans?.length === 0 && <p className="text-gray-400 text-sm">No subscriptions yet.</p>}
          {data?.topPlans?.map((p: any) => (
            <div key={p.planId} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span>{p.name}</span><span className="font-medium">{p.count} subs</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="font-semibold mb-4">Upcoming Renewals</h2>
          {data?.upcomingRenewals?.length === 0 && <p className="text-gray-400 text-sm">None.</p>}
          {data?.upcomingRenewals?.map((s: any) => (
            <div key={s.id} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span>{s.customer?.name}</span><span className="text-gray-500">{s.plan?.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
