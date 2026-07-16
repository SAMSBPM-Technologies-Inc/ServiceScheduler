import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Plus, Search, Edit2, Archive } from 'lucide-react'

interface Product { id: string; code: string; name: string; category: string; subCategory?: string; price: number; active: boolean; description?: string }

function ProductForm({ product, onClose }: { product?: Product; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    code: product?.code || '', name: product?.name || '', category: product?.category || '',
    subCategory: product?.subCategory || '', price: Number(product?.price) || 0,
    description: product?.description || '', weight: '', footnote: '', alertNote: '',
    active: product?.active ?? true,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      product ? vendorApi.put(`/vendor/products/${product.id}`, data) : vendorApi.post('/vendor/products', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-products'] }); onClose() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-lg mb-4">{product ? 'Edit Product' : 'New Product'}</h2>
        {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Code *</label><input className="input" value={form.code} onChange={set('code')} required /></div>
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={set('name')} required /></div>
          <div><label className="label">Category *</label><input className="input" value={form.category} onChange={set('category')} required /></div>
          <div><label className="label">Sub-Category</label><input className="input" value={form.subCategory} onChange={set('subCategory')} /></div>
          <div><label className="label">Price ($)</label><input className="input" type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} /></div>
          <div><label className="label">Weight/Unit</label><input className="input" value={form.weight} onChange={set('weight')} /></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></div>
          <div><label className="label">Footnote</label><input className="input" value={form.footnote} onChange={set('footnote')} /></div>
          <div><label className="label">Alert Note</label><input className="input" value={form.alertNote} onChange={set('alertNote')} /></div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>{mutation.isPending ? 'Saving...' : 'Save'}</button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | undefined>()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-products', search],
    queryFn: () => vendorApi.get('/vendor/products', { params: { search: search || undefined } }).then(r => r.data.products),
  })

  const archive = useMutation({
    mutationFn: (id: string) => vendorApi.delete(`/vendor/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-products'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setShowForm(true) }}>
          <Plus size={16} /> Add Product
        </button>
      </div>
      <div className="card">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        {isLoading && <p className="text-gray-400">Loading...</p>}
        <table className="w-full text-sm">
          <thead><tr className="border-b text-gray-500 text-left">
            <th className="pb-2 font-medium">Code</th><th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Category</th><th className="pb-2 font-medium">Price</th>
            <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {data?.map((p: Product) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 font-mono text-xs">{p.code}</td>
                <td className="py-3">{p.name}</td>
                <td className="py-3 text-gray-500">{p.category}</td>
                <td className="py-3">${Number(p.price).toFixed(2)}</td>
                <td className="py-3">{p.active ? <span className="badge-active">Active</span> : <span className="badge-cancelled">Archived</span>}</td>
                <td className="py-3 flex gap-2">
                  <button onClick={() => { setEditing(p); setShowForm(true) }} className="text-gray-400 hover:text-primary-600"><Edit2 size={15} /></button>
                  <button onClick={() => archive.mutate(p.id)} className="text-gray-400 hover:text-red-500"><Archive size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.length === 0 && <p className="text-center text-gray-400 py-8">No products yet.</p>}
      </div>
      {showForm && <ProductForm product={editing} onClose={() => { setShowForm(false); setEditing(undefined) }} />}
    </div>
  )
}
