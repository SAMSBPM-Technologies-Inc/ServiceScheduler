import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { ChevronLeft, Edit2, Play, Pause, XCircle } from 'lucide-react'
import { useState } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const cls = status === 'ACTIVE' ? 'badge-active' : status === 'PAUSED' ? 'badge-paused' : 'badge-cancelled'
  return <span className={cls}>{status}</span>
}

function getProductName(plan: any, productId: string): string {
  // Search fixed plan product groups
  for (const tier of plan?.scheduleTiers ?? []) {
    for (const pg of tier.productGroups ?? []) {
      const item = pg.items?.find((i: any) => i.productId === productId)
      if (item?.product) return item.product.name
    }
  }
  // Search configurable plan products
  const cp = plan?.configurableProducts?.find((c: any) => c.productId === productId)
  if (cp?.product) return cp.product.name
  return productId
}

// ── Edit Selections Modal (Fixed plan) ─────────────────────────────────────

function EditSelectionsModal({ sub, onClose }: { sub: any; onClose: () => void }) {
  const qc = useQueryClient()
  const tier = sub.plan?.scheduleTiers?.find((t: any) => t.tier === sub.selectedTier)
  const groups = tier?.productGroups ?? []

  // Build initial selection map: groupId → productId[]  (supports CHOOSE_N)
  const initial: Record<string, string[]> = {}
  for (const sel of sub.selections ?? []) {
    if (!initial[sel.productGroupId]) initial[sel.productGroupId] = []
    initial[sel.productGroupId].push(sel.productId)
  }
  const [selections, setSelections] = useState<Record<string, string[]>>(initial)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => {
      const payload = Object.entries(selections).flatMap(([productGroupId, productIds]) =>
        productIds.map(productId => ({ productGroupId, productId }))
      )
      return vendorApi.put(`/vendor/subscriptions/${sub.id}/selections`, { selections: payload })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-subscription', sub.id] }); onClose() },
    onError: () => setError('Failed to save selections'),
  })

  // Check if all required groups are satisfied
  const canSave = groups.every((group: any) => {
    if (group.selectionRule === 'ALL') return true
    const chosen = selections[group.id] || []
    if (group.selectionRule === 'CHOOSE_ONE') return chosen.length === 1
    return chosen.length === (group.chooseN ?? 1)
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Edit Product Selections</h2>
        {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
        <div className="space-y-6">
          {groups.map((group: any) => (
            <div key={group.id}>
              <div className="font-medium text-sm mb-2">
                {group.name}
                {group.selectionRule !== 'ALL' && (
                  <span className="text-xs text-primary-600 ml-2 font-normal">
                    {group.selectionRule === 'CHOOSE_ONE' ? '— choose 1' : `— choose ${group.chooseN}`}
                  </span>
                )}
              </div>

              {group.selectionRule === 'ALL' ? (
                <div className="flex flex-wrap gap-2">
                  {group.items?.map((item: any) => (
                    <span key={item.id} className="text-sm bg-green-50 border border-green-200 rounded px-3 py-1 text-green-800">
                      ✓ {item.product?.name}
                    </span>
                  ))}
                </div>
              ) : group.selectionRule === 'CHOOSE_ONE' ? (
                <div className="space-y-2">
                  {group.items?.map((item: any) => {
                    const isSelected = selections[group.id]?.[0] === item.productId
                    return (
                      <label key={item.id} className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name={group.id}
                          value={item.productId}
                          checked={isSelected}
                          onChange={() => setSelections(s => ({ ...s, [group.id]: [item.productId] }))}
                        />
                        {item.product?.name}
                      </label>
                    )
                  })}
                </div>
              ) : (
                // CHOOSE_N — checkboxes with limit
                <div className="space-y-2">
                  {group.items?.map((item: any) => {
                    const chosen = selections[group.id] || []
                    const isChecked = chosen.includes(item.productId)
                    const atLimit = chosen.length >= (group.chooseN ?? 1)
                    return (
                      <label key={item.id} className={`flex items-center gap-3 border-2 rounded-lg p-3 cursor-pointer transition-colors ${isChecked ? 'border-primary-500 bg-primary-50' : atLimit ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!isChecked && atLimit}
                          onChange={() => setSelections(s => {
                            const prev = s[group.id] || []
                            const next = isChecked ? prev.filter(id => id !== item.productId) : [...prev, item.productId]
                            return { ...s, [group.id]: next }
                          })}
                        />
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
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending || !canSave}>
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Edit Task Schedules Modal (Configurable plan) ───────────────────────────

function EditSchedulesModal({ sub, onClose }: { sub: any; onClose: () => void }) {
  const qc = useQueryClient()
  const configurableProducts = sub.plan?.configurableProducts ?? []

  // Build initial schedules map: productId → { tier, price }
  const initial: Record<string, { tier: string; price: number; enabled: boolean }> = {}
  for (const cp of configurableProducts) {
    const existing = sub.taskSchedules?.find((ts: any) => ts.productId === cp.productId)
    const tiers = typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers
    const prices = typeof cp.pricePerTier === 'string' ? JSON.parse(cp.pricePerTier) : cp.pricePerTier
    const defaultTier = tiers?.[0] ?? 'WEEKLY'
    initial[cp.productId] = {
      enabled: !!existing,
      tier: existing?.tier ?? defaultTier,
      price: existing ? Number(existing.price) : (Number(prices?.[defaultTier]) || 0),
    }
  }
  const [schedules, setSchedules] = useState(initial)
  const [error, setError] = useState('')

  const save = useMutation({
    mutationFn: () => {
      const taskSchedules = Object.entries(schedules)
        .filter(([, v]) => v.enabled)
        .map(([productId, v]) => ({ productId, tier: v.tier, price: v.price }))
      return vendorApi.put(`/vendor/subscriptions/${sub.id}/schedules`, { taskSchedules })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-subscription', sub.id] }); onClose() },
    onError: () => setError('Failed to save schedules'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">Edit Task Schedules</h2>
        {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
        <div className="space-y-4">
          {configurableProducts.map((cp: any) => {
            const tiers: string[] = typeof cp.allowedTiers === 'string' ? JSON.parse(cp.allowedTiers) : cp.allowedTiers
            const prices: Record<string, number> = typeof cp.pricePerTier === 'string' ? JSON.parse(cp.pricePerTier) : cp.pricePerTier
            const s = schedules[cp.productId]
            return (
              <div key={cp.productId} className={`border rounded-lg p-3 ${s?.enabled ? 'border-primary-200 bg-primary-50' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={s?.enabled ?? false}
                      onChange={e => setSchedules(prev => ({ ...prev, [cp.productId]: { ...prev[cp.productId], enabled: e.target.checked } }))}
                    />
                    {cp.product?.name}
                  </label>
                </div>
                {s?.enabled && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="label text-xs">Frequency</label>
                      <select
                        className="input text-sm"
                        value={s.tier}
                        onChange={e => {
                          const tier = e.target.value
                          setSchedules(prev => ({ ...prev, [cp.productId]: { ...prev[cp.productId], tier, price: Number(prices?.[tier]) || prev[cp.productId].price } }))
                        }}
                      >
                        {tiers.map((t: string) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Price ($)</label>
                      <input
                        className="input text-sm"
                        type="number"
                        step="0.01"
                        value={s.price}
                        onChange={e => setSchedules(prev => ({ ...prev, [cp.productId]: { ...prev[cp.productId], price: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function SubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showEditSelections, setShowEditSelections] = useState(false)
  const [showEditSchedules, setShowEditSchedules] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-subscription', id],
    queryFn: () => vendorApi.get(`/vendor/subscriptions/${id}`).then(r => r.data.subscription),
  })

  const changeStatus = useMutation({
    mutationFn: (status: string) => vendorApi.patch(`/vendor/subscriptions/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-subscription', id] }),
  })

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!data) return <div className="p-8 text-gray-400">Not found</div>

  const isFixed = data.plan?.planType === 'FIXED'

  return (
    <div className="p-4 sm:p-8 max-w-3xl">
      <button onClick={() => navigate('/vendor/subscriptions')} className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <ChevronLeft size={16} /> Back to Subscriptions
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Subscription Detail</h1>
        <div className="flex flex-wrap gap-2">
          {data.status === 'ACTIVE' && (
            <>
              <button
                className="btn-secondary flex items-center gap-1.5 text-sm"
                onClick={() => changeStatus.mutate('PAUSED')}
                disabled={changeStatus.isPending}
              >
                <Pause size={14} /> Pause
              </button>
              <button
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => { if (confirm('Cancel this subscription?')) changeStatus.mutate('CANCELLED') }}
                disabled={changeStatus.isPending}
              >
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
          {data.status === 'PAUSED' && (
            <>
              <button
                className="btn-primary flex items-center gap-1.5 text-sm"
                onClick={() => changeStatus.mutate('ACTIVE')}
                disabled={changeStatus.isPending}
              >
                <Play size={14} /> Resume
              </button>
              <button
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => { if (confirm('Cancel this subscription?')) changeStatus.mutate('CANCELLED') }}
                disabled={changeStatus.isPending}
              >
                <XCircle size={14} /> Cancel
              </button>
            </>
          )}
          {data.status === 'CANCELLED' && (
            <button
              className="btn-primary flex items-center gap-1.5 text-sm"
              onClick={() => changeStatus.mutate('ACTIVE')}
              disabled={changeStatus.isPending}
            >
              <Play size={14} /> Reactivate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            <div><span className="text-gray-500">Status: </span>{statusBadge(data.status)}</div>
            {data.selectedTier && <div><span className="text-gray-500">Tier: </span>{data.selectedTier}</div>}
            <div><span className="text-gray-500">Since: </span>{new Date(data.startDate).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {data.instructions?.length > 0 && (
        <div className="card mt-6">
          <h2 className="font-semibold mb-2">Customer Instructions</h2>
          {data.instructions.map((i: any) => <p key={i.id} className="text-sm text-gray-700">{i.text}</p>)}
        </div>
      )}

      {/* Fixed plan selections */}
      {isFixed && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Product Selections</h2>
            <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline" onClick={() => setShowEditSelections(true)}>
              <Edit2 size={13} /> Edit
            </button>
          </div>
          {data.selections?.length > 0 ? (
            <div className="space-y-1">
              {data.selections.map((sel: any) => (
                <div key={sel.id} className="text-sm py-2 border-b last:border-0 flex justify-between">
                  <span className="text-gray-500">{sel.productGroup?.name}</span>
                  <span className="font-medium">{getProductName(data.plan, sel.productId)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No selections — all products included.</p>
          )}
        </div>
      )}

      {/* Configurable plan task schedules */}
      {!isFixed && data.taskSchedules?.length > 0 && (
        <div className="card mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Task Schedules</h2>
            <button className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline" onClick={() => setShowEditSchedules(true)}>
              <Edit2 size={13} /> Edit
            </button>
          </div>
          <div className="space-y-1">
            {data.taskSchedules.map((ts: any) => (
              <div key={ts.id} className="text-sm py-2 border-b last:border-0 flex justify-between items-center">
                <span className="font-medium">{getProductName(data.plan, ts.productId)}</span>
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="text-xs bg-gray-100 rounded px-2 py-0.5">{ts.tier}</span>
                  <span>${Number(ts.price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h2 className="font-semibold mb-3">Payment History</h2>
        {data.payments?.length > 0 ? (
          <div className="space-y-1">
            {data.payments.map((p: any) => (
              <div key={p.id} className="text-sm py-2 border-b last:border-0 flex justify-between items-center">
                <span className="text-gray-500">{p.billingPeriod}</span>
                <span className="font-medium">${Number(p.amount).toFixed(2)}</span>
                <span className={`badge-${p.status.toLowerCase()}`}>{p.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No payments.</p>
        )}
      </div>

      {showEditSelections && <EditSelectionsModal sub={data} onClose={() => setShowEditSelections(false)} />}
      {showEditSchedules && <EditSchedulesModal sub={data} onClose={() => setShowEditSchedules(false)} />}
    </div>
  )
}
