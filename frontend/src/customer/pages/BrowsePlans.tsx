import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../../lib/api'
import { useVendorSlug, usePortalPath } from '../../lib/VendorContext'

export default function BrowsePlans() {
  const slug = useVendorSlug()
  const portalPath = usePortalPath()
  const navigate = useNavigate()
  const { data: plans, isLoading } = useQuery({
    queryKey: ['portal-plans', slug],
    queryFn: () => customerApi.get(`/portal/vendor/${slug}/plans`).then(r => r.data.plans),
    enabled: !!slug,
  })

  if (isLoading) return <p className="text-gray-400">Loading plans...</p>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Available Plans</h1>
      {plans?.length === 0 && <p className="text-gray-400">No active plans available.</p>}
      <div className="grid gap-6">
        {plans?.map((plan: any) => (
          <div key={plan.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${plan.planType === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{plan.planType}</span>
                </div>
                {plan.description && <p className="text-gray-500 mt-1">{plan.description}</p>}
              </div>
              <button className="btn-primary" onClick={() => navigate(portalPath(`/plans/${plan.id}/subscribe`))}>
                Subscribe
              </button>
            </div>

            {plan.planType === 'FIXED' && (
              <div className="mt-4 grid gap-4">
                {plan.scheduleTiers?.map((tier: any) => (
                  <div key={tier.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-medium">{tier.tier}</span>
                      <span className="text-xl font-bold text-primary-600">${Number(tier.price).toFixed(2)}</span>
                    </div>
                    {tier.productGroups?.map((group: any) => (
                      <div key={group.id} className="mb-2">
                        <div className="text-sm font-medium text-gray-700">{group.name}
                          {group.selectionRule !== 'ALL' && <span className="text-xs text-gray-400 ml-2">({group.selectionRule === 'CHOOSE_ONE' ? 'choose 1' : `choose ${group.chooseN}`})</span>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {group.items?.map((item: any) => (
                            <span key={item.id} className="text-xs bg-white border rounded px-2 py-1">{item.product?.name}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {plan.planType === 'CONFIGURABLE' && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-3">Choose your tasks and set individual schedules:</p>
                <div className="flex flex-wrap gap-2">
                  {plan.configurableProducts?.map((cp: any) => (
                    <div key={cp.id} className="text-xs bg-gray-100 border rounded-lg px-3 py-2">
                      <span className="font-medium">{cp.product?.name}</span>
                      <span className="text-gray-400 ml-2">{cp.allowedTiers?.join(' / ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
