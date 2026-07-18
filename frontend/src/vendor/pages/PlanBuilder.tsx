import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'

type PlanType = 'FIXED' | 'CONFIGURABLE'
type ScheduleTier = 'DAILY' | 'WEEKLY' | 'MONTHLY'
type SelectionRule = 'ALL' | 'CHOOSE_ONE' | 'CHOOSE_N'
const TIERS: ScheduleTier[] = ['DAILY', 'WEEKLY', 'MONTHLY']

interface GroupItem { productId: string; sortOrder: number }
interface ProductGroup { name: string; selectionRule: SelectionRule; chooseN?: number; sortOrder: number; items: GroupItem[] }
interface TierConfig { tier: ScheduleTier; price: number; productGroups: ProductGroup[] }
interface ConfigurableProduct { productId: string; allowedTiers: ScheduleTier[]; pricePerTier: Record<string, number> }

function tiersFromPlan(plan: any): TierConfig[] {
  return (plan.scheduleTiers || []).map((st: any) => ({
    tier: st.tier as ScheduleTier,
    price: Number(st.price),
    productGroups: (st.productGroups || []).map((pg: any) => ({
      name: pg.name,
      selectionRule: pg.selectionRule as SelectionRule,
      chooseN: pg.chooseN,
      sortOrder: pg.sortOrder,
      items: (pg.items || []).map((i: any) => ({ productId: i.productId, sortOrder: i.sortOrder })),
    })),
  }))
}

function cpFromPlan(plan: any): ConfigurableProduct[] {
  return (plan.configurableProducts || []).map((cp: any) => ({
    productId: cp.productId,
    allowedTiers: Array.isArray(cp.allowedTiers) ? cp.allowedTiers : JSON.parse(cp.allowedTiers || '[]'),
    pricePerTier: typeof cp.pricePerTier === 'object' && !Array.isArray(cp.pricePerTier) ? cp.pricePerTier : JSON.parse(cp.pricePerTier || '{}'),
  }))
}

function FixedPlanBuilder({ products, initialPlan, planId }: { products: any[]; initialPlan?: any; planId?: string }) {
  const navigate = useNavigate()
  const [name, setName] = useState(initialPlan?.name || '')
  const [description, setDescription] = useState(initialPlan?.description || '')
  const [tiers, setTiers] = useState<TierConfig[]>(() => initialPlan ? tiersFromPlan(initialPlan) : [])
  const [error, setError] = useState('')

  const isEdit = !!planId

  const addTier = () => {
    const available = TIERS.filter(t => !tiers.find(x => x.tier === t))
    if (!available.length) return
    setTiers(t => [...t, { tier: available[0], price: 0, productGroups: [] }])
  }

  const updateTier = (i: number, patch: Partial<TierConfig>) =>
    setTiers(t => t.map((x, idx) => idx === i ? { ...x, ...patch } : x))

  const removeTier = (i: number) => setTiers(t => t.filter((_, idx) => idx !== i))

  const addGroup = (tierIdx: number) =>
    updateTier(tierIdx, { productGroups: [...tiers[tierIdx].productGroups, { name: '', selectionRule: 'ALL', sortOrder: tiers[tierIdx].productGroups.length, items: [] }] })

  const updateGroup = (tierIdx: number, gIdx: number, patch: Partial<ProductGroup>) =>
    updateTier(tierIdx, { productGroups: tiers[tierIdx].productGroups.map((g, i) => i === gIdx ? { ...g, ...patch } : g) })

  const removeGroup = (tierIdx: number, gIdx: number) =>
    updateTier(tierIdx, { productGroups: tiers[tierIdx].productGroups.filter((_, i) => i !== gIdx) })

  const toggleProduct = (tierIdx: number, gIdx: number, productId: string) => {
    const group = tiers[tierIdx].productGroups[gIdx]
    const exists = group.items.find(i => i.productId === productId)
    const newItems = exists ? group.items.filter(i => i.productId !== productId) : [...group.items, { productId, sortOrder: group.items.length }]
    updateGroup(tierIdx, gIdx, { items: newItems })
  }

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? vendorApi.put(`/vendor/plans/${planId}`, { name, description, scheduleTiers: tiers })
      : vendorApi.post('/vendor/plans', { planType: 'FIXED', name, description, scheduleTiers: tiers }),
    onSuccess: () => navigate('/vendor/plans'),
    onError: (err: any) => setError(err.response?.data?.error || 'Error saving plan'),
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Plan Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Veg Meal Plan" /></div>
        <div><label className="label">Description</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Schedule Tiers</h3>
          <button className="btn-secondary flex items-center gap-2 text-xs" onClick={addTier}><Plus size={14} /> Add Tier</button>
        </div>
        {tiers.map((tier, ti) => (
          <div key={ti} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <select className="input w-36" value={tier.tier} onChange={e => updateTier(ti, { tier: e.target.value as ScheduleTier })}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Price $</span>
                <input className="input w-28" type="number" step="0.01" value={tier.price} onChange={e => updateTier(ti, { price: parseFloat(e.target.value) || 0 })} />
              </div>
              <button onClick={() => removeTier(ti)} className="ml-auto text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>

            <div className="ml-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Product Groups</span>
                <button className="text-xs text-primary-600 hover:underline flex items-center gap-1" onClick={() => addGroup(ti)}><Plus size={12} /> Add Group</button>
              </div>
              {tier.productGroups.map((group, gi) => (
                <div key={gi} className="border border-gray-100 rounded p-3 mb-2 bg-gray-50">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <input className="input flex-1 min-w-[120px]" placeholder="Group name" value={group.name} onChange={e => updateGroup(ti, gi, { name: e.target.value })} />
                    <select className="input w-36" value={group.selectionRule} onChange={e => updateGroup(ti, gi, { selectionRule: e.target.value as SelectionRule })}>
                      <option value="ALL">All included</option>
                      <option value="CHOOSE_ONE">Choose one</option>
                      <option value="CHOOSE_N">Choose N</option>
                    </select>
                    {group.selectionRule === 'CHOOSE_N' && (
                      <input className="input w-20" type="number" min={1} placeholder="N" value={group.chooseN || ''} onChange={e => updateGroup(ti, gi, { chooseN: parseInt(e.target.value) })} />
                    )}
                    <button onClick={() => removeGroup(ti, gi)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {products.filter(p => p.active).map((p: any) => (
                      <label key={p.id} className="flex items-center gap-1.5 text-xs bg-white border rounded px-2 py-1 cursor-pointer hover:bg-blue-50">
                        <input type="checkbox" checked={!!group.items.find(i => i.productId === p.id)} onChange={() => toggleProduct(ti, gi, p.id)} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm">{error}</div>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={!name || tiers.length === 0 || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/vendor/plans')}>Cancel</button>
      </div>
    </div>
  )
}

function ConfigurablePlanBuilder({ products, initialPlan, planId }: { products: any[]; initialPlan?: any; planId?: string }) {
  const navigate = useNavigate()
  const [name, setName] = useState(initialPlan?.name || '')
  const [description, setDescription] = useState(initialPlan?.description || '')
  const [configurableProducts, setConfigurableProducts] = useState<ConfigurableProduct[]>(() => initialPlan ? cpFromPlan(initialPlan) : [])
  const [error, setError] = useState('')

  const isEdit = !!planId

  const toggleProduct = (productId: string) => {
    const exists = configurableProducts.find(p => p.productId === productId)
    if (exists) setConfigurableProducts(cp => cp.filter(p => p.productId !== productId))
    else setConfigurableProducts(cp => [...cp, { productId, allowedTiers: [], pricePerTier: {} }])
  }

  const updateCp = (productId: string, patch: Partial<ConfigurableProduct>) =>
    setConfigurableProducts(cp => cp.map(p => p.productId === productId ? { ...p, ...patch } : p))

  const toggleTier = (productId: string, tier: ScheduleTier) => {
    const cp = configurableProducts.find(p => p.productId === productId)!
    const newTiers = cp.allowedTiers.includes(tier) ? cp.allowedTiers.filter(t => t !== tier) : [...cp.allowedTiers, tier]
    updateCp(productId, { allowedTiers: newTiers })
  }

  const mutation = useMutation({
    mutationFn: () => isEdit
      ? vendorApi.put(`/vendor/plans/${planId}`, { name, description, configurableProducts })
      : vendorApi.post('/vendor/plans', { planType: 'CONFIGURABLE', name, description, configurableProducts }),
    onSuccess: () => navigate('/vendor/plans'),
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className="label">Plan Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Description</label><input className="input" value={description} onChange={e => setDescription(e.target.value)} /></div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Select Tasks & Allowed Schedules</h3>
        <div className="space-y-2">
          {products.filter(p => p.active).map((p: any) => {
            const cp = configurableProducts.find(x => x.productId === p.id)
            return (
              <div key={p.id} className="border rounded-lg p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!cp} onChange={() => toggleProduct(p.id)} />
                  <span className="font-medium text-sm">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.category}</span>
                </label>
                {cp && (
                  <div className="ml-6 mt-2 space-y-2">
                    <div className="flex gap-3">
                      {TIERS.map(tier => (
                        <label key={tier} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <input type="checkbox" checked={cp.allowedTiers.includes(tier)} onChange={() => toggleTier(p.id, tier)} />
                          {tier}
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      {cp.allowedTiers.map(tier => (
                        <div key={tier} className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">{tier} $</span>
                          <input className="input w-20 text-xs" type="number" step="0.01"
                            value={cp.pricePerTier[tier] || ''}
                            onChange={e => updateCp(p.id, { pricePerTier: { ...cp.pricePerTier, [tier]: parseFloat(e.target.value) || 0 } })} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm">{error}</div>}
      <div className="flex gap-3">
        <button className="btn-primary" onClick={() => mutation.mutate()} disabled={!name || configurableProducts.length === 0 || mutation.isPending}>
          {mutation.isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
        </button>
        <button className="btn-secondary" onClick={() => navigate('/vendor/plans')}>Cancel</button>
      </div>
    </div>
  )
}

export default function PlanBuilder() {
  const navigate = useNavigate()
  const { id: planId } = useParams<{ id?: string }>()
  const isEdit = !!planId
  const [planType, setPlanType] = useState<PlanType>('FIXED')

  const { data: products = [] } = useQuery({
    queryKey: ['vendor-products-all'],
    queryFn: () => vendorApi.get('/vendor/products?active=true').then(r => r.data.products),
  })

  const { data: existingPlan, isLoading: planLoading } = useQuery({
    queryKey: ['vendor-plan', planId],
    queryFn: () => vendorApi.get(`/vendor/plans/${planId}`).then(r => r.data.plan),
    enabled: isEdit,
  })

  // Derive planType from existing plan when editing
  const activePlanType: PlanType = isEdit ? (existingPlan?.planType || 'FIXED') : planType

  if (isEdit && planLoading) {
    return <div className="p-8 text-gray-400">Loading plan...</div>
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl">
      <button onClick={() => navigate('/vendor/plans')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ChevronLeft size={16} /> Back to Plans
      </button>
      <h1 className="text-2xl font-bold mb-6">{isEdit ? 'Edit Plan' : 'Create New Plan'}</h1>

      {!isEdit && (
        <div className="card mb-6">
          <h2 className="font-semibold mb-3">Plan Type</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['FIXED', 'CONFIGURABLE'] as PlanType[]).map(t => (
              <label key={t} className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${planType === t ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="planType" value={t} checked={planType === t} onChange={() => setPlanType(t)} className="sr-only" />
                <div className="font-medium">{t === 'FIXED' ? 'Fixed Bundle' : 'Configurable'}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {t === 'FIXED' ? 'Predefined tiers with product groups (e.g. meal plans)' : 'Customer picks tasks + individual schedules (e.g. cleaning services)'}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {isEdit && existingPlan && (
        <div className="mb-4 flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activePlanType === 'FIXED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {activePlanType}
          </span>
          <span className="text-xs text-gray-400">Plan type cannot be changed after creation</span>
        </div>
      )}

      <div className="card">
        {activePlanType === 'FIXED'
          ? <FixedPlanBuilder products={products} initialPlan={isEdit ? existingPlan : undefined} planId={planId} />
          : <ConfigurablePlanBuilder products={products} initialPlan={isEdit ? existingPlan : undefined} planId={planId} />
        }
      </div>
    </div>
  )
}
