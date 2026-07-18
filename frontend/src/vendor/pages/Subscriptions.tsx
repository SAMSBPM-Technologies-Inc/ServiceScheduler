import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Subscriptions() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-subscriptions', status],
    queryFn: () => vendorApi.get('/vendor/subscriptions', { params: status ? { status } : {} }).then(r => r.data.subscriptions),
  })

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Subscriptions</h1>
      <div className="card">
        <div className="flex flex-wrap gap-2 mb-4">
          {['', 'ACTIVE', 'PAUSED', 'CANCELLED'].map(s => (
            <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-lg text-sm ${status === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {isLoading && <p className="text-gray-400">Loading...</p>}
        <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[500px]">
          <thead><tr className="border-b text-gray-500 text-left">
            <th className="pb-2 font-medium">Customer</th><th className="pb-2 font-medium">Plan</th>
            <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Start Date</th><th className="pb-2 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {data?.map((s: any) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3">
                  <div>{s.customer?.name}</div>
                  <div className="text-gray-400 text-xs">{s.customer?.email}</div>
                </td>
                <td className="py-3">
                  <div>{s.plan?.name}</div>
                  <div className="text-gray-400 text-xs">{s.plan?.planType}</div>
                </td>
                <td className="py-3"><span className={`badge-${s.status.toLowerCase()}`}>{s.status}</span></td>
                <td className="py-3 text-gray-500">{new Date(s.startDate).toLocaleDateString()}</td>
                <td className="py-3">
                  <button onClick={() => navigate(`/vendor/subscriptions/${s.id}`)} className="text-primary-600 hover:underline text-xs">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {data?.length === 0 && <p className="text-center text-gray-400 py-8">No subscriptions.</p>}
      </div>
    </div>
  )
}
