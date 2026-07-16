import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { ChevronLeft } from 'lucide-react'

export default function SubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-subscription', id],
    queryFn: () => vendorApi.get(`/vendor/subscriptions/${id}`).then(r => r.data.subscription),
  })

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!data) return <div className="p-8 text-gray-400">Not found</div>

  return (
    <div className="p-8 max-w-3xl">
      <button onClick={() => navigate('/vendor/subscriptions')} className="flex items-center gap-2 text-sm text-gray-500 mb-6"><ChevronLeft size={16} /> Back</button>
      <h1 className="text-2xl font-bold mb-6">Subscription Detail</h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold mb-3">Customer</h2>
          <div className="text-sm space-y-1">
            <div><span className="text-gray-500">Name: </span>{data.customer?.name}</div>
            <div><span className="text-gray-500">Email: </span>{data.customer?.email}</div>
            {data.customer?.phone && <div><span className="text-gray-500">Phone: </span>{data.customer.phone}</div>}
          </div>
        </div>
        <div className="card">
          <h2 className="font-semibold mb-3">Plan</h2>
          <div className="text-sm space-y-1">
            <div><span className="text-gray-500">Name: </span>{data.plan?.name}</div>
            <div><span className="text-gray-500">Type: </span>{data.plan?.planType}</div>
            <div><span className="text-gray-500">Status: </span><span className={`badge-${data.status.toLowerCase()}`}>{data.status}</span></div>
            {data.selectedTier && <div><span className="text-gray-500">Tier: </span>{data.selectedTier}</div>}
          </div>
        </div>
      </div>

      {data.instructions?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-2">Instructions</h2>
          {data.instructions.map((i: any) => <p key={i.id} className="text-sm text-gray-700">{i.text}</p>)}
        </div>
      )}

      {data.selections?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-3">Selections (Fixed Plan)</h2>
          {data.selections.map((sel: any) => (
            <div key={sel.id} className="text-sm py-1 border-b last:border-0">
              <span className="text-gray-500">{sel.productGroup?.name}: </span>
              <span className="font-medium">{sel.productId}</span>
            </div>
          ))}
        </div>
      )}

      {data.taskSchedules?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-3">Task Schedules (Configurable Plan)</h2>
          {data.taskSchedules.map((ts: any) => (
            <div key={ts.id} className="text-sm py-1 border-b last:border-0 flex justify-between">
              <span>{ts.productId}</span>
              <span className="text-gray-500">{ts.tier} — ${Number(ts.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Payment History</h2>
        {data.payments?.map((p: any) => (
          <div key={p.id} className="text-sm py-1 border-b last:border-0 flex justify-between">
            <span>{p.billingPeriod}</span>
            <span>${Number(p.amount).toFixed(2)}</span>
            <span className={`badge-${p.status.toLowerCase()}`}>{p.status}</span>
          </div>
        ))}
        {data.payments?.length === 0 && <p className="text-gray-400 text-sm">No payments.</p>}
      </div>
    </div>
  )
}
