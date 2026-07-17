import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { platformApi } from '../../lib/adminApi'
import { ChevronLeft, KeyRound, ToggleLeft, ToggleRight, ExternalLink } from 'lucide-react'

function ResetPasswordModal({ title, onReset, onClose }: { title: string; onReset: (pw: string) => Promise<void>; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (pw.length < 8) { setError('Minimum 8 characters'); return }
    setLoading(true)
    try {
      await onReset(pw)
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h2 className="font-bold text-lg mb-4">Reset Password — {title}</h2>
        {done ? (
          <>
            <div className="bg-green-50 text-green-700 rounded p-3 text-sm mb-4">Password updated successfully.</div>
            <button className="btn-primary w-full" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
            <label className="label">New Password</label>
            <input
              className="input mb-4"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoFocus
              placeholder="Min. 8 characters"
            />
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={submit} disabled={loading}>{loading ? 'Saving...' : 'Reset Password'}</button>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

type Tab = 'overview' | 'team' | 'plans' | 'subscriptions'

export default function VendorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [resetTarget, setResetTarget] = useState<{ title: string; fn: (pw: string) => Promise<void> } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-vendor', id],
    queryFn: () => platformApi.get(`/platform/vendors/${id}`).then(r => r.data.vendor),
  })

  const toggleUser = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      platformApi.patch(`/platform/vendors/${id}/users/${userId}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-vendor', id] }),
  })

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      platformApi.patch(`/platform/vendors/${id}/users/${userId}`, { role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform-vendor', id] }),
  })

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!data) return <div className="p-8 text-gray-400">Not found</div>

  const tabs: Tab[] = ['overview', 'team', 'plans', 'subscriptions']

  return (
    <div>
      <button onClick={() => navigate('/admin/vendors')} className="flex items-center gap-2 text-sm text-gray-500 mb-6 hover:text-gray-700">
        <ChevronLeft size={16} /> All Vendors
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="text-sm text-gray-500 mt-1">{data.email} · /{data.slug}</div>
          {data.customDomain && <div className="text-sm text-primary-600 mt-0.5">{data.customDomain}</div>}
        </div>
        <button
          className="flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-gray-50"
          onClick={() => setResetTarget({
            title: `${data.name} (owner)`,
            fn: (pw) => platformApi.post(`/platform/vendors/${id}/reset-password`, { newPassword: pw }).then(() => {}),
          })}
        >
          <KeyRound size={14} /> Reset Owner Password
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Subscriptions', value: data._count.subscriptions },
          { label: 'Plans', value: data._count.plans },
          { label: 'Team Members', value: data._count.vendorUsers },
          { label: 'Stripe', value: data.hasStripeKey ? 'Configured' : 'Not set' },
        ].map(s => (
          <div key={s.label} className="bg-white border rounded-xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-0">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="bg-white border rounded-xl p-5 text-sm space-y-2">
          <div><span className="text-gray-500 w-32 inline-block">Vendor ID</span><span className="font-mono text-xs">{data.id}</span></div>
          <div><span className="text-gray-500 w-32 inline-block">Slug</span>{data.slug}</div>
          <div><span className="text-gray-500 w-32 inline-block">Custom Domain</span>{data.customDomain || '—'}</div>
          <div><span className="text-gray-500 w-32 inline-block">Stripe Keys</span>{data.hasStripeKey ? '✓ Configured' : 'Not configured'}</div>
          <div><span className="text-gray-500 w-32 inline-block">Created</span>{new Date(data.createdAt).toLocaleString()}</div>
        </div>
      )}

      {tab === 'team' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {data.vendorUsers?.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="text-xs border rounded px-2 py-1"
                      value={u.role}
                      onChange={e => changeRole.mutate({ userId: u.id, role: e.target.value })}
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="WORKER">Worker</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleUser.mutate({ userId: u.id, active: !u.active })} className="flex items-center gap-1 text-xs">
                      {u.active
                        ? <><ToggleRight size={16} className="text-green-500" /><span className="text-green-600">Active</span></>
                        : <><ToggleLeft size={16} className="text-gray-400" /><span className="text-gray-400">Inactive</span></>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
                      onClick={() => setResetTarget({
                        title: u.name,
                        fn: (pw) => platformApi.post(`/platform/vendors/${id}/users/${u.id}/reset-password`, { newPassword: pw }).then(() => {}),
                      })}
                    >
                      <KeyRound size={13} /> Reset password
                    </button>
                  </td>
                </tr>
              ))}
              {data.vendorUsers?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No team members.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'plans' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Subscriptions</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr></thead>
            <tbody>
              {data.plans?.map((p: any) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.planType}</td>
                  <td className="px-4 py-3">{p._count.subscriptions}</td>
                  <td className="px-4 py-3">{p.active ? <span className="badge-active">Active</span> : <span className="badge-cancelled">Inactive</span>}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.plans?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No plans.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Since</th>
            </tr></thead>
            <tbody>
              {data.subscriptions?.map((s: any) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.customer.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.customer.email}</td>
                  <td className="px-4 py-3">{s.plan.name}</td>
                  <td className="px-4 py-3"><span className={`badge-${s.status.toLowerCase()}`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {data.subscriptions?.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No subscriptions.</td></tr>
              )}
            </tbody>
          </table>
          {data._count.subscriptions > 20 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t">Showing 20 most recent of {data._count.subscriptions} total.</div>
          )}
        </div>
      )}

      {resetTarget && (
        <ResetPasswordModal
          title={resetTarget.title}
          onReset={resetTarget.fn}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
