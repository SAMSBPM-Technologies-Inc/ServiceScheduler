import { Outlet, NavLink, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../lib/api'

export default function CustomerLayout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const token = localStorage.getItem('customer_token')

  const { data: vendor } = useQuery({
    queryKey: ['portal-vendor', slug],
    queryFn: () => customerApi.get(`/portal/vendor/${slug}`).then(r => r.data.vendor),
  })

  function logout() {
    localStorage.removeItem('customer_token')
    navigate(`/portal/${slug}/login`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-lg text-primary-600">{vendor?.name || 'Service Portal'}</div>
          <nav className="flex items-center gap-6 text-sm">
            <NavLink to={`/portal/${slug}/plans`} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>Plans</NavLink>
            {token && <>
              <NavLink to={`/portal/${slug}/subscriptions`} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>My Subscriptions</NavLink>
              <NavLink to={`/portal/${slug}/payments`} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>Payments</NavLink>
              <button onClick={logout} className="text-gray-400 hover:text-gray-700">Logout</button>
            </>}
            {!token && <NavLink to={`/portal/${slug}/login`} className="btn-primary">Login</NavLink>}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
