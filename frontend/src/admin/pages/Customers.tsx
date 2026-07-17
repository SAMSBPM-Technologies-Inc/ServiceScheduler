import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { platformApi } from '../../lib/adminApi'
import { Search, KeyRound } from 'lucide-react'

function ResetPasswordModal({ customer, onClose }: { customer: any; onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const reset = useMutation({
    mutationFn: () => platformApi.post(`/platform/customers/${customer.id}/reset-password`, { newPassword: pw }),
    onSuccess: () => setDone(true),
    onError: (err: any) => setError(err.response?.data?.error || 'Error'),
  })

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6">
        <h2 className="font-bold text-lg mb-1">Reset Password</h2>
        <p className="text-sm text-gray-500 mb-4">{customer.name} · {customer.email}</p>
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
              onKeyDown={e => e.key === 'Enter' && pw.length >= 8 && reset.mutate()}
              autoFocus
              placeholder="Min. 8 characters"
            />
            <div className="flex gap-3">
              <button className="btn-primary flex-1" onClick={() => reset.mutate()} disabled={pw.length < 8 || reset.isPending}>
                {reset.isPending ? 'Saving...' : 'Reset Password'}
              </button>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Customers() {
  const [search, setSearch] = useState('')
  const [resetting, setResetting] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['platform-customers', search],
    queryFn: () => platformApi.get('/platform/customers', { params: { search: search || undefined } }).then(r => r.data.customers),
    staleTime: 10_000,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Customers</h1>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-gray-500 text-left bg-gray-50">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Subscriptions</th>
            <th className="px-4 py-3 font-medium">Joined</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr></thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
            )}
            {data?.map((c: any) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.email}</td>
                <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                <td className="px-4 py-3">{c._count.subscriptions}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
                    onClick={() => setResetting(c)}
                  >
                    <KeyRound size={13} /> Reset password
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {resetting && <ResetPasswordModal customer={resetting} onClose={() => setResetting(null)} />}
    </div>
  )
}
