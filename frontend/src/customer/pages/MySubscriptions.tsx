import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { customerApi } from '../../lib/api'
import { useNavigate, useParams } from 'react-router-dom'

export default function MySubscriptions() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['customer-subscriptions'],
    queryFn: () => customerApi.get('/customer/subscriptions').then(r => r.data.subscriptions),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => customerApi.patch(`/customer/subscriptions/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-subscriptions'] }),
  })

  if (isLoading) return <p className="text-gray-400">Loading...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Subscriptions</h1>
      {subscriptions?.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No subscriptions yet.</p>
          <button onClick={() => navigate(`/portal/${slug}/plans`)} className="btn-primary mt-4">Browse Plans</button>
        </div>
      )}
      <div className="space-y-4">
        {subscriptions?.map((s: any) => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{s.plan?.name}</h3>
                  <span className={`badge-${s.status.toLowerCase()}`}>{s.status}</span>
                </div>
                <div className="text-sm text-gray-500">{s.vendor?.name} · {s.plan?.planType}</div>
                {s.selectedTier && <div className="text-xs text-gray-400 mt-1">Tier: {s.selectedTier}</div>}
                {s.taskSchedules?.length > 0 && (
                  <div className="text-xs text-gray-400 mt-1">{s.taskSchedules.length} tasks configured</div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate(`/portal/${slug}/subscriptions/${s.id}`)} className="btn-secondary text-xs">Details</button>
                {s.status === 'ACTIVE' && (
                  <button onClick={() => updateStatus.mutate({ id: s.id, status: 'PAUSED' })} className="btn-secondary text-xs">Pause</button>
                )}
                {s.status === 'PAUSED' && (
                  <button onClick={() => updateStatus.mutate({ id: s.id, status: 'ACTIVE' })} className="btn-secondary text-xs">Resume</button>
                )}
                {s.status !== 'CANCELLED' && (
                  <button onClick={() => { if (confirm('Cancel subscription?')) updateStatus.mutate({ id: s.id, status: 'CANCELLED' }) }} className="btn-danger text-xs">Cancel</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
