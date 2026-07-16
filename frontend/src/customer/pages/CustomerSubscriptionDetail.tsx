import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../../lib/api'
import { ChevronLeft } from 'lucide-react'
import { usePortalPath } from '../../lib/VendorContext'

export default function CustomerSubscriptionDetail() {
  const { subId } = useParams()
  const portalPath = usePortalPath()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [instructionText, setInstructionText] = useState('')
  const [editingInstruction, setEditingInstruction] = useState(false)

  const { data: sub, isLoading } = useQuery({
    queryKey: ['customer-subscription', subId],
    queryFn: () => customerApi.get(`/customer/subscriptions/${subId}`).then(r => r.data.subscription),
  })

  const saveInstruction = useMutation({
    mutationFn: () => customerApi.put(`/customer/subscriptions/${subId}/instructions`, { text: instructionText }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-subscription', subId] }); setEditingInstruction(false) },
  })

  const payNow = useMutation({
    mutationFn: (paymentId: string) => customerApi.post('/payments/checkout', {
      paymentId,
      successUrl: `${window.location.origin}${portalPath(`/subscriptions/${subId}`)}`,
      cancelUrl: window.location.href,
    }).then(r => { window.location.href = r.data.url }),
  })

  if (isLoading) return <p className="text-gray-400">Loading...</p>
  if (!sub) return <p className="text-gray-400">Not found.</p>

  const pendingPayment = sub.payments?.find((p: any) => p.status === 'PENDING')

  return (
    <div className="max-w-2xl">
      <button onClick={() => navigate(portalPath('/subscriptions'))} className="flex items-center gap-2 text-sm text-gray-500 mb-6"><ChevronLeft size={16} /> Back</button>
      <h1 className="text-2xl font-bold mb-6">{sub.plan?.name}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card">
          <div className="text-sm text-gray-500">Status</div>
          <div className="mt-1"><span className={`badge-${sub.status?.toLowerCase()}`}>{sub.status}</span></div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500">Vendor</div>
          <div className="mt-1 font-medium">{sub.vendor?.name}</div>
        </div>
        {sub.selectedTier && (
          <div className="card">
            <div className="text-sm text-gray-500">Schedule Tier</div>
            <div className="mt-1 font-medium">{sub.selectedTier}</div>
          </div>
        )}
        <div className="card">
          <div className="text-sm text-gray-500">Start Date</div>
          <div className="mt-1">{new Date(sub.startDate).toLocaleDateString()}</div>
        </div>
      </div>

      {sub.taskSchedules?.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold mb-3">Your Task Schedules</h2>
          <div className="space-y-2">
            {sub.taskSchedules.map((ts: any) => (
              <div key={ts.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span>{ts.productId}</span>
                <span className="text-gray-500">{ts.tier}</span>
                <span className="font-medium">${Number(ts.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Instructions</h2>
          <button onClick={() => {
            if (!editingInstruction && sub.instructions?.[0]) setInstructionText(sub.instructions[0].text)
            setEditingInstruction(!editingInstruction)
          }} className="text-sm text-primary-600 hover:underline">
            {editingInstruction ? 'Cancel' : 'Edit'}
          </button>
        </div>
        {editingInstruction ? (
          <div className="space-y-2">
            <textarea className="input" rows={3} value={instructionText} onChange={e => setInstructionText(e.target.value)} placeholder="Add delivery/service instructions..." />
            <button className="btn-primary text-sm" onClick={() => saveInstruction.mutate()} disabled={saveInstruction.isPending}>Save</button>
          </div>
        ) : (
          <p className="text-sm text-gray-700">{sub.instructions?.[0]?.text || <span className="text-gray-400">No instructions set.</span>}</p>
        )}
      </div>

      <div className="card mb-4">
        <h2 className="font-semibold mb-3">Payments</h2>
        {pendingPayment && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Payment due: ${Number(pendingPayment.amount).toFixed(2)}</div>
              <div className="text-xs text-gray-500">{pendingPayment.billingPeriod}</div>
            </div>
            <button className="btn-primary text-sm" onClick={() => payNow.mutate(pendingPayment.id)} disabled={payNow.isPending}>
              {payNow.isPending ? 'Redirecting...' : 'Pay Now'}
            </button>
          </div>
        )}
        {sub.payments?.map((p: any) => (
          <div key={p.id} className="flex justify-between text-sm py-2 border-b last:border-0">
            <span>{p.billingPeriod}</span>
            <span>${Number(p.amount).toFixed(2)}</span>
            <span className={`badge-${p.status.toLowerCase()}`}>{p.status}</span>
          </div>
        ))}
        {sub.payments?.length === 0 && <p className="text-gray-400 text-sm">No payments.</p>}
      </div>
    </div>
  )
}
