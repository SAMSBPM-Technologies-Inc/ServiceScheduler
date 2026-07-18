import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function Reports() {
  const { data: dashboard } = useQuery({ queryKey: ['vendor-dashboard'], queryFn: () => vendorApi.get('/vendor/reports/dashboard').then(r => r.data) })
  const { data: revenue } = useQuery({ queryKey: ['vendor-revenue-90'], queryFn: () => vendorApi.get('/vendor/reports/revenue?period=90d').then(r => r.data.revenue) })

  async function exportCsv() {
    const res = await vendorApi.get('/vendor/reports/export/subscriptions', { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a'); a.href = url; a.download = 'subscriptions.csv'; a.click()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button className="btn-secondary flex items-center gap-2" onClick={exportCsv}><Download size={16} /> Export CSV</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Active Subscriptions', value: dashboard?.subscriptions?.active ?? '—' },
          { label: 'Total Revenue', value: `$${Number(dashboard?.totalRevenue || 0).toFixed(2)}` },
          { label: 'Cancelled', value: dashboard?.subscriptions?.cancelled ?? '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card text-center">
            <div className="text-3xl font-bold text-primary-600">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {revenue && revenue.length > 0 && (
        <div className="card mb-8">
          <h2 className="font-semibold mb-4">Revenue by Day (90 Days)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={revenue}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => `$${v.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <h2 className="font-semibold mb-4">Top Plans</h2>
        {dashboard?.topPlans?.map((p: any) => (
          <div key={p.planId} className="flex justify-between py-2 border-b last:border-0 text-sm">
            <span>{p.name}</span><span className="font-semibold">{p.count} subscribers</span>
          </div>
        ))}
        {dashboard?.topPlans?.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
      </div>
    </div>
  )
}
