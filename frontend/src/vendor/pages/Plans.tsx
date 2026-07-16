import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { Plus, ToggleLeft, ToggleRight, ChevronDown, Edit2 } from 'lucide-react'
import { useState } from 'react'

export default function Plans() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-plans'],
    queryFn: () => vendorApi.get('/vendor/plans').then(r => r.data.plans),
  })

  const toggle = useMutation({
    mutationFn: (id: string) => vendorApi.patch(`/vendor/plans/${id}/activate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-plans'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Plans</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/vendor/plans/new')}>
          <Plus size={16} /> Create Plan
        </button>
      </div>
      {isLoading && <p className="text-gray-400">Loading...</p>}
      <div className="space-y-4">
        {data?.map((plan: any) => (
          <div key={plan.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.planType === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{plan.planType}</span>
                  {plan.active ? <span className="badge-active">Active</span> : <span className="badge-cancelled">Inactive</span>}
                </div>
                {plan.description && <p className="text-sm text-gray-500 mt-1">{plan.description}</p>}
                <div className="text-xs text-gray-400 mt-1">{plan._count?.subscriptions || 0} subscriptions</div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`/vendor/plans/${plan.id}/edit`)} className="text-gray-400 hover:text-primary-600" title="Edit plan">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => toggle.mutate(plan.id)} className="text-gray-400 hover:text-primary-600">
                  {plan.active ? <ToggleRight size={24} className="text-green-500" /> : <ToggleLeft size={24} />}
                </button>
                <button onClick={() => setExpanded(expanded === plan.id ? null : plan.id)} className="text-gray-400 hover:text-gray-700">
                  <ChevronDown size={18} className={`transition-transform ${expanded === plan.id ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            {expanded === plan.id && (
              <div className="mt-4 border-t pt-4">
                {plan.planType === 'FIXED' ? (
                  <div className="space-y-3">
                    {plan.scheduleTiers?.map((tier: any) => (
                      <div key={tier.id}>
                        <div className="font-medium text-sm text-gray-700">{tier.tier} — ${Number(tier.price).toFixed(2)}</div>
                        <div className="mt-2 space-y-1">
                          {tier.productGroups?.map((group: any) => (
                            <div key={group.id} className="ml-4 text-xs text-gray-500">
                              <span className="font-medium">{group.name}</span> ({group.selectionRule}):{' '}
                              {group.items?.map((i: any) => i.product?.name).join(', ')}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div className="font-medium text-sm text-gray-700 mb-2">Configurable Tasks</div>
                    <div className="space-y-1">
                      {plan.configurableProducts?.map((cp: any) => (
                        <div key={cp.id} className="text-xs text-gray-500 ml-4">
                          <span className="font-medium">{cp.product?.name}</span> — tiers: {cp.allowedTiers?.join(', ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {data?.length === 0 && <p className="text-center text-gray-400 py-8">No plans yet. Create your first plan.</p>}
      </div>
    </div>
  )
}
