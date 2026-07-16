import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { vendorApi } from '../../lib/api'

export default function VendorRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', slug: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await vendorApi.post('/vendor/auth/register', form)
      localStorage.setItem('vendor_token', data.token)
      navigate('/vendor/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="card">
          <h1 className="text-2xl font-bold mb-6">Create Vendor Account</h1>
          {error && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="label">Business Name</label><input className="input" value={form.name} onChange={set('name')} required /></div>
            <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={set('email')} required /></div>
            <div><label className="label">Password</label><input className="input" type="password" value={form.password} onChange={set('password')} minLength={8} required /></div>
            <div>
              <label className="label">Portal Slug <span className="text-gray-400 font-normal">(e.g. fresh-meals)</span></label>
              <input className="input" value={form.slug} onChange={set('slug')} pattern="[a-z0-9-]+" placeholder="my-business" required />
              <p className="text-xs text-gray-400 mt-1">Customer portal: /portal/{form.slug || 'your-slug'}</p>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating...' : 'Create Account'}</button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">Already have an account? <Link to="/vendor/login" className="text-primary-600 hover:underline">Login</Link></p>
        </div>
      </div>
    </div>
  )
}
