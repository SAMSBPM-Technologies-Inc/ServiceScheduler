import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Plus, Edit2, Trash2, UserCheck, UserX } from 'lucide-react'

interface Member {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'WORKER'
  active: boolean
  createdAt: string
}

function MemberForm({ member, onClose }: { member?: Member; onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: member?.name || '',
    email: member?.email || '',
    password: '',
    role: member?.role || 'WORKER' as 'ADMIN' | 'WORKER',
    active: member?.active ?? true,
  })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      member
        ? vendorApi.put(`/vendor/team/${member.id}`, data)
        : vendorApi.post('/vendor/team', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-team'] }); onClose() },
    onError: (err: any) => setError(err.response?.data?.error || 'Error saving member'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md p-6">
        <h2 className="font-bold text-lg mb-4">{member ? 'Edit Member' : 'Add Team Member'}</h2>
        {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">{member ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={member ? 'Leave blank to keep current' : ''} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'WORKER' }))}>
              <option value="ADMIN">Admin — full access</option>
              <option value="WORKER">Worker — read-only access</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            <label htmlFor="active" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button className="btn-primary" onClick={() => mutation.mutate(form)} disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Team() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Member | undefined>()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-team'],
    queryFn: () => vendorApi.get('/vendor/team').then(r => r.data.members),
  })

  const remove = useMutation({
    mutationFn: (id: string) => vendorApi.delete(`/vendor/team/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-team'] }),
  })

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-gray-500 mt-1">Manage who can access this vendor dashboard</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={() => { setEditing(undefined); setShowForm(true) }}>
          <Plus size={16} /> Add Member
        </button>
      </div>

      <div className="card">
        {isLoading && <p className="text-gray-400">Loading...</p>}
        <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b text-gray-500 text-left">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((m: Member) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3 font-medium">{m.name}</td>
                <td className="py-3 text-gray-500">{m.email}</td>
                <td className="py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.role}
                  </span>
                </td>
                <td className="py-3">
                  {m.active
                    ? <span className="flex items-center gap-1 text-green-600 text-xs"><UserCheck size={13} /> Active</span>
                    : <span className="flex items-center gap-1 text-gray-400 text-xs"><UserX size={13} /> Inactive</span>}
                </td>
                <td className="py-3 flex gap-2">
                  <button onClick={() => { setEditing(m); setShowForm(true) }} className="text-gray-400 hover:text-primary-600"><Edit2 size={15} /></button>
                  <button onClick={() => { if (confirm('Remove this member?')) remove.mutate(m.id) }} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {data?.length === 0 && (
          <p className="text-center text-gray-400 py-8">No team members yet. Add your first member above.</p>
        )}
      </div>

      {showForm && <MemberForm member={editing} onClose={() => { setShowForm(false); setEditing(undefined) }} />}
    </div>
  )
}
