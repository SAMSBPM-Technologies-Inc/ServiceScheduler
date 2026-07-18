import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { isAdmin } from '../../lib/useVendorRole'
import { Plus, Search, Edit2, Archive, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Product { id: string; code: string; name: string; category: string; subCategory?: string; price: number; active: boolean; description?: string }
interface SubCategory { id: string; name: string }
interface Category { id: string; name: string; subCategories: SubCategory[] }

// ── Hooks ────────────────────────────────────────────────────────────────────

function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['vendor-categories'],
    queryFn: () => vendorApi.get('/vendor/categories').then(r => r.data.categories),
  })
}

// ── Product Form Modal ───────────────────────────────────────────────────────

function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: categories = [] } = useCategories()

  const [form, setForm] = useState({
    code: product?.code || '', name: product?.name || '', category: product?.category || '',
    subCategory: product?.subCategory || '', price: Number(product?.price) || 0,
    description: product?.description || '', active: product?.active ?? true,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      product ? vendorApi.put(`/vendor/products/${product.id}`, data) : vendorApi.post('/vendor/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-products'] }); onClose() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const selectedCategory = categories.find(c => c.name === form.category)
  const subOptions = selectedCategory?.subCategories ?? []

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">{product ? 'Edit Product' : 'New Product'}</h2>
        {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
        {categories.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 mb-4">
            No categories set up yet. Go to the <strong>Categories</strong> tab to add them first.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Code *</label><input className="input" value={form.code} onChange={set('code')} required /></div>
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
          <div>
            <label className="label">Category *</label>
            <select
              className="input"
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value, subCategory: '' }))}
            >
              <option value="">— Select category —</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sub-Category</label>
            <select
              className="input"
              value={form.subCategory}
              onChange={e => setForm(f => ({ ...f, subCategory: e.target.value }))}
              disabled={!form.category || subOptions.length === 0}
            >
              <option value="">— Select sub-category —</option>
              {subOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div><label className="label">Price ($)</label><input className="input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending || !form.category || !form.code || !form.name}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Categories Tab ───────────────────────────────────────────────────────────

function CategoryRow({ cat, onUpdated }: { cat: Category; onUpdated: () => void }) {
  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [catName, setCatName] = useState(cat.name)
  const [newSubName, setNewSubName] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubName, setEditingSubName] = useState('')
  const [error, setError] = useState('')

  const renameCategory = useMutation({
    mutationFn: () => vendorApi.put(`/vendor/categories/${cat.id}`, { name: catName.trim() }),
    onSuccess: () => { setEditingName(false); onUpdated() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const deleteCategory = useMutation({
    mutationFn: () => vendorApi.delete(`/vendor/categories/${cat.id}`),
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const addSub = useMutation({
    mutationFn: () => vendorApi.post(`/vendor/categories/${cat.id}/subcategories`, { name: newSubName.trim() }),
    onSuccess: () => { setNewSubName(''); setAddingSub(false); onUpdated() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const renameSub = useMutation({
    mutationFn: (subId: string) => vendorApi.put(`/vendor/categories/${cat.id}/subcategories/${subId}`, { name: editingSubName.trim() }),
    onSuccess: () => { setEditingSubId(null); onUpdated() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const deleteSub = useMutation({
    mutationFn: (subId: string) => vendorApi.delete(`/vendor/categories/${cat.id}/subcategories/${subId}`),
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  return (
    <div className="border rounded-xl overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              className="input py-1 text-sm flex-1"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') renameCategory.mutate(); if (e.key === 'Escape') { setEditingName(false); setCatName(cat.name) } }}
              autoFocus
            />
            <button className="btn-primary py-1 px-3 text-xs" onClick={() => renameCategory.mutate()} disabled={!catName.trim() || renameCategory.isPending}>Save</button>
            <button className="btn-secondary py-1 px-3 text-xs" onClick={() => { setEditingName(false); setCatName(cat.name) }}>Cancel</button>
          </div>
        ) : (
          <span className="font-semibold flex-1">{cat.name}</span>
        )}

        <span className="text-xs text-gray-400">{cat.subCategories.length} sub-categories</span>
        {!editingName && (
          <>
            <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-primary-600"><Edit2 size={14} /></button>
            <button
              onClick={() => { if (confirm(`Delete "${cat.name}" and all its sub-categories?`)) deleteCategory.mutate() }}
              className="text-gray-400 hover:text-red-500"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-xs px-4 py-2">{error}</div>}

      {/* Sub-categories */}
      {expanded && (
        <div className="px-4 py-3 space-y-2">
          {cat.subCategories.length === 0 && !addingSub && (
            <p className="text-xs text-gray-400">No sub-categories yet.</p>
          )}
          {cat.subCategories.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 pl-4">
              {editingSubId === sub.id ? (
                <>
                  <input
                    className="input py-1 text-sm flex-1"
                    value={editingSubName}
                    onChange={e => setEditingSubName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameSub.mutate(sub.id); if (e.key === 'Escape') setEditingSubId(null) }}
                    autoFocus
                  />
                  <button className="btn-primary py-1 px-3 text-xs" onClick={() => renameSub.mutate(sub.id)} disabled={!editingSubName.trim()}>Save</button>
                  <button className="btn-secondary py-1 px-3 text-xs" onClick={() => setEditingSubId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 text-gray-700">• {sub.name}</span>
                  <button onClick={() => { setEditingSubId(sub.id); setEditingSubName(sub.name) }} className="text-gray-300 hover:text-primary-600"><Edit2 size={13} /></button>
                  <button onClick={() => { if (confirm(`Delete "${sub.name}"?`)) deleteSub.mutate(sub.id) }} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          ))}

          {addingSub ? (
            <div className="flex items-center gap-2 pl-4 mt-2">
              <input
                className="input py-1 text-sm flex-1"
                placeholder="Sub-category name"
                value={newSubName}
                onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newSubName.trim()) addSub.mutate(); if (e.key === 'Escape') { setAddingSub(false); setNewSubName('') } }}
                autoFocus
              />
              <button className="btn-primary py-1 px-3 text-xs" onClick={() => addSub.mutate()} disabled={!newSubName.trim() || addSub.isPending}>Add</button>
              <button className="btn-secondary py-1 px-3 text-xs" onClick={() => { setAddingSub(false); setNewSubName('') }}>Cancel</button>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 text-xs text-primary-600 hover:underline pl-4 mt-1"
              onClick={() => setAddingSub(true)}
            >
              <Plus size={12} /> Add sub-category
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function CategoriesTab() {
  const qc = useQueryClient()
  const admin = isAdmin()
  const { data: categories = [], isLoading } = useCategories()
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  const addCategory = useMutation({
    mutationFn: () => vendorApi.post('/vendor/categories', { name: newCatName.trim() }),
    onSuccess: () => { setNewCatName(''); setAddingCat(false); qc.invalidateQueries({ queryKey: ['vendor-categories'] }) },
  })

  const refresh = () => qc.invalidateQueries({ queryKey: ['vendor-categories'] })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Define the categories and sub-categories available when creating products.</p>
        {admin && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setAddingCat(true)}>
            <Plus size={15} /> Add Category
          </button>
        )}
      </div>

      {addingCat && (
        <div className="flex items-center gap-2 mb-4 p-3 border rounded-xl bg-gray-50">
          <input
            className="input py-1.5 text-sm flex-1"
            placeholder="Category name (e.g. Cleaning, Lawn & Garden)"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newCatName.trim()) addCategory.mutate(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName('') } }}
            autoFocus
          />
          <button className="btn-primary py-1.5 px-4 text-sm" onClick={() => addCategory.mutate()} disabled={!newCatName.trim() || addCategory.isPending}>Add</button>
          <button className="btn-secondary py-1.5 px-3 text-sm" onClick={() => { setAddingCat(false); setNewCatName('') }}>Cancel</button>
        </div>
      )}

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {categories.map(cat => (
          <CategoryRow key={cat.id} cat={cat} onUpdated={refresh} />
        ))}
        {!isLoading && categories.length === 0 && (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed rounded-xl">
            <p className="text-sm">No categories yet.</p>
            <p className="text-xs mt-1">Click "Add Category" to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const qc = useQueryClient()
  const admin = isAdmin()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-products', search],
    queryFn: () => vendorApi.get('/vendor/products', { params: { search: search || undefined } }).then(r => r.data.products),
  })

  const archive = useMutation({
    mutationFn: (id: string) => vendorApi.delete(`/vendor/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-products'] }),
  })

  return (
    <div>
      <div className="flex gap-3 mb-4 items-center justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {admin && (
          <button className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap" onClick={() => { setEditing(undefined); setShowForm(true) }}>
            <Plus size={15} /> Add Product
          </button>
        )}
      </div>

      {isLoading && <p className="text-gray-400">Loading...</p>}
      <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm min-w-[600px]">
        <thead><tr className="border-b text-gray-500 text-left">
          <th className="pb-2 font-medium">Code</th>
          <th className="pb-2 font-medium">Name</th>
          <th className="pb-2 font-medium">Category</th>
          <th className="pb-2 font-medium">Sub-Category</th>
          <th className="pb-2 font-medium">Price</th>
          <th className="pb-2 font-medium">Status</th>
          {admin && <th className="pb-2 font-medium">Actions</th>}
        </tr></thead>
        <tbody>
          {data?.map((p: Product) => (
            <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
              <td className="py-3 font-mono text-xs">{p.code}</td>
              <td className="py-3">{p.name}</td>
              <td className="py-3 text-gray-500">{p.category}</td>
              <td className="py-3 text-gray-400 text-xs">{p.subCategory || '—'}</td>
              <td className="py-3">${Number(p.price).toFixed(2)}</td>
              <td className="py-3">{p.active ? <span className="badge-active">Active</span> : <span className="badge-cancelled">Archived</span>}</td>
              {admin && (
                <td className="py-3 flex gap-2">
                  <button onClick={() => { setEditing(p); setShowForm(true) }} className="text-gray-400 hover:text-primary-600"><Edit2 size={15} /></button>
                  <button onClick={() => archive.mutate(p.id)} className="text-gray-400 hover:text-red-500"><Archive size={15} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {data?.length === 0 && <p className="text-center text-gray-400 py-8">No products yet.</p>}
      {showForm && <ProductForm product={editing} onClose={() => { setShowForm(false); setEditing(undefined) }} />}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'products' | 'categories'

export default function Products() {
  const [tab, setTab] = useState<Tab>('products')

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Products</h1>

      <div className="border-b mb-6">
        <div className="flex gap-0">
          {(['products', 'categories'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'products' ? 'Products' : 'Categories'}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {tab === 'products' ? <ProductsTab /> : <CategoriesTab />}
      </div>
    </div>
  )
}
