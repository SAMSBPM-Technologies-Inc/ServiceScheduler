import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { platformApi } from '../../lib/adminApi'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await platformApi.post('/platform/auth/login', form)
      localStorage.setItem('platform_token', data.token)
      localStorage.setItem('platform_admin', JSON.stringify(data.admin))
      navigate('/admin/vendors')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border w-full max-w-sm p-8">
        <div className="mb-8 text-center">
          <div className="w-10 h-10 bg-gray-900 rounded-xl mx-auto mb-3 flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <h1 className="text-xl font-bold">Platform Admin</h1>
          <p className="text-gray-500 text-sm mt-1">ServStack Control Panel</p>
        </div>

        {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="admin@example.com" autoFocus />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={form.password} onChange={set('password')}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          <button className="btn-primary w-full" onClick={submit} disabled={loading}>
            {loading ? 'Please wait...' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  )
}
