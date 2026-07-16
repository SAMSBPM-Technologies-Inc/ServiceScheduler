import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { customerApi } from '../../lib/api'
import { useVendorSlug, usePortalPath } from '../../lib/VendorContext'

export default function SubscribePlan() {
  const { planId } = useParams()
  const slug = useVendorSlug()
  const portalPath = usePortalPath()
  const navigate = useNavigate()

  const { data: plans } = useQuery({
    queryKey: ['portal-plans', slug],
    queryFn: () => customerApi.get(`/portal/vendor/${slug}/plans`).then(r => r.data.plans),
  })

  const plan = plans?.find((p: any) => p.id === planId)

  const [selectedTier, setSelectedTier] = useState('')
  const [selections, setSelections] = useState<Record<string, string[]>>({}) // groupId -> productId[]
  const [taskSchedules, setTaskSchedules] = useState<Record<string, { tier: string; price: number }>>({}) // productId -> {tier, price}
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (plan?.planType === 'FIXED') {
        return customerApi.post('/customer/subscriptions/fixed', {
          planId,
          selectedTier,
          selections: Object.entries(selections).flatMap(([productGroupId, productIds]) =>
            productIds.map(productId => ({ productGroupId, productId }))
          ),
        })
      } else {
        return customerApi.post('/customer/subscriptions/configurable', {
          planId,
          taskSchedules: Object.entries(taskSchedules).map(([productId, { tier, price }]) => ({ productId, tier, price })),
        })
      }
    },
    onSuccess: () => navigate(portalPath('/subscriptions')),
    onError: (err: any) => setError(err.response?.data?.error || 'Subscription failed'),
  })

  if (!plan) return <p className="text-gray-400">Loading...</p>

  const tierData = plan.scheduleTiers?.find((t: any) => t.tier === selectedTier)

  // --- canConfirm: prevent submitting incomplete state ---
  let canConfirm = false
  if (plan.planType === 'FIXED') {
    if (selectedTier && tierData) {
      canConfirm = tierData.productGroups?.every((group: any) => {
        if (group.selectionRule === 'ALL') return true
        const chosen = selections[group.id] || []
        if (group.selectionRule === 'CHOOSE_ONE') return chosen.length === 1
        return chosen.length === (group.chooseN ?? 1)
      }) ?? true
    }
  } else {
    const tasks = Object.values(taskSchedules)
    canConfirm = tasks.length > 0 && tasks.every(ts => ts.tier !== '')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Subscribe to {plan.name}</h1>
      <p className="text-gray-500 mb-6">{plan.description}</p>

      {plan.planType === 'FIXED' ? (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Choose Schedule Tier</h2>
            <div className="grid gap-3">
              {plan.scheduleTiers?.map((tier: any) => (
                <label key={tier.id} className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${selectedTier === tier.tier ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="tier" value={tier.tier} checked={selectedTier === tier.tier} onChange={() => { setSelectedTier(tier.tier); setSelections({}) }} className="sr-only" />
                  <div className="flex justify-between">
                    <span className="font-medium">{tier.tier}</span>
                    <span className="text-primary-600 font-bold">${Number(tier.price).toFixed(2)}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {tierData && (
            <div className="card">
              <h2 className="font-semibold mb-4">Make Your Selections</h2>
              {tierData.productGroups?.map((group: any) => (
                <div key={group.id} className="mb-5">
                  <div className="font-medium text-sm mb-2">{group.name}
                    {group.selectionRule !== 'ALL' && (
                      <span className="text-xs text-primary-600 ml-2 font-normal">
                        {group.selectionRule === 'CHOOSE_ONE' ? '— choose 1' : `— choose ${group.chooseN}`}
                      </span>
                    )}
                  </div>
                  {group.selectionRule === 'ALL' ? (
                    <div className="flex flex-wrap gap-2">
                      {group.items?.map((item: any) => (
                        <span key={item.id} className="text-sm bg-green-50 border border-green-200 rounded px-3 py-1 text-green-800">✓ {item.product?.name}</span>
                      ))}
                    </div>
                  ) : group.selectionRule === 'CHOOSE_ONE' ? (
                    <div className="space-y-2">
                      {group.items?.map((item: any) => (
                        <label key={item.id} className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition-colors ${selections[group.id]?.[0] === item.product?.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" name={group.id} value={item.product?.id}
                            checked={selections[group.id]?.[0] === item.product?.id}
                            onChange={() => setSelections(s => ({ ...s, [group.id]: [item.product?.id] }))} />
                          {item.product?.name}
                        </label>
                      ))}
                    </div>
                  ) : (
                    // CHOOSE_N — checkboxes, max N
                    <div className="space-y-2">
                      {group.items?.map((item: any) => {
                        const chosen = selections[group.id] || []
                        const isChecked = chosen.includes(item.product?.id)
                        const atLimit = chosen.length >= (group.chooseN ?? 1)
                        return (
                          <label key={item.id} className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition-colors ${isChecked ? 'border-primary-500 bg-primary-50' : atLimit ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input type="checkbox" checked={isChecked}
                              disabled={!isChecked && atLimit}
                              onChange={() => setSelections(s => {
                                const prev = s[group.id] || []
                                const next = isChecked ? prev.filter(id => id !== item.product?.id) : [...prev, item.product?.id]
                                return { ...s, [group.id]: next }
                              })} />
                            {item.product?.name}
                          </label>
                        )
                      })}
                      <p className="text-xs text-gray-400 mt-1">
                        {(selections[group.id] || []).length} / {group.chooseN} selected
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="font-semibold mb-4">Choose Your Tasks & Schedules</h2>
          {plan.configurableProducts?.map((cp: any) => {
            const ts = taskSchedules[cp.product?.id]
            return (
              <div key={cp.id} className="border rounded-lg p-4 mb-3">
                <label className="flex items-center gap-3 cursor-pointer mb-3">
                  <input type="checkbox" checked={!!ts} onChange={e => {
                    if (e.target.checked) {
                      // Auto-select the first allowed tier so tier is never empty
                      const firstTier = cp.allowedTiers?.[0] || ''
                      const firstPrice = (cp.pricePerTier as Record<string, number>)?.[firstTier] || 0
                      setTaskSchedules(s => ({ ...s, [cp.product?.id]: { tier: firstTier, price: firstPrice } }))
                    } else {
                      setTaskSchedules(s => { const n = { ...s }; delete n[cp.product?.id]; return n })
                    }
                  }} />
                  <span className="font-medium">{cp.product?.name}</span>
                  <span className="text-xs text-gray-400">{cp.product?.category}</span>
                </label>
                {ts && (
                  <div className="ml-6 grid grid-cols-3 gap-2">
                    {cp.allowedTiers?.map((tier: string) => {
                      const price = (cp.pricePerTier as Record<string, number>)?.[tier] || 0
                      return (
                        <label key={tier} className={`border-2 rounded p-2 cursor-pointer text-center transition-colors ${ts.tier === tier ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" name={cp.product?.id} value={tier}
                            checked={ts.tier === tier}
                            onChange={() => setTaskSchedules(s => ({ ...s, [cp.product?.id]: { tier, price } }))}
                            className="sr-only" />
                          <div className="text-sm font-medium">{tier}</div>
                          <div className="text-xs text-primary-600">${price.toFixed(2)}</div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mt-4">{error}</div>}

      <div className="flex gap-3 mt-6">
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={!canConfirm || mutation.isPending}>
          {mutation.isPending ? 'Subscribing...' : 'Confirm Subscription'}
        </button>
        <button className="btn-secondary" onClick={() => navigate(portalPath('/plans'))}>Cancel</button>
      </div>
    </div>
  )
}
