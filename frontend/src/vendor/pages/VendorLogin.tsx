import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { vendorApi } from '../../lib/api'

export default function VendorLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await vendorApi.post('/vendor/auth/login', form)
      localStorage.setItem('vendor_token', data.token)
      navigate('/vendor/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vendor Login</h1>
          <p className="text-gray-500 text-sm mb-6">Sign in to your vendor dashboard</p>
          {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            No account? <Link to="/vendor/register" className="text-primary-600 hover:underline">Register</Link>
          </p>
          <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-500">
            <strong>Demo:</strong> vendor@freshmeals.com / password123
          </div>
        </div>
      </div>
    </div>
  )
}
