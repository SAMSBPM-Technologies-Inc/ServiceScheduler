import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../lib/api'
import { useVendorSlug, usePortalPath } from '../lib/VendorContext'
import { Menu, X } from 'lucide-react'

export default function CustomerLayout() {
  const slug = useVendorSlug()
  const portalPath = usePortalPath()
  const navigate = useNavigate()
  const token = localStorage.getItem('customer_token')
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: vendor } = useQuery({
    queryKey: ['portal-vendor', slug],
    queryFn: () => customerApi.get(`/portal/vendor/${slug}`).then(r => r.data.vendor),
    enabled: !!slug,
  })

  function logout() {
    localStorage.removeItem('customer_token')
    navigate(portalPath('/login'))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-bold text-lg text-primary-600 truncate mr-4">{vendor?.name || 'Service Portal'}</div>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6 text-sm flex-shrink-0">
            <NavLink to={portalPath('/plans')} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>Plans</NavLink>
            {token && <>
              <NavLink to={portalPath('/subscriptions')} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>My Subscriptions</NavLink>
              <NavLink to={portalPath('/payments')} className={({ isActive }) => isActive ? 'text-primary-600 font-medium' : 'text-gray-500 hover:text-gray-900'}>Payments</NavLink>
              <button onClick={logout} className="text-gray-400 hover:text-gray-700">Logout</button>
            </>}
            {!token && <NavLink to={portalPath('/login')} className="btn-primary">Login</NavLink>}
          </nav>
          {/* Mobile hamburger */}
          <button className="sm:hidden p-2 text-gray-500 hover:text-gray-700 flex-shrink-0" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {/* Mobile nav dropdown */}
        {menuOpen && (
          <div className="sm:hidden border-t bg-white px-4 py-2 space-y-1 text-sm">
            <NavLink to={portalPath('/plans')} onClick={() => setMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg ${isActive ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-600 hover:bg-gray-50'}`}>
              Plans
            </NavLink>
            {token && <>
              <NavLink to={portalPath('/subscriptions')} onClick={() => setMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg ${isActive ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                My Subscriptions
              </NavLink>
              <NavLink to={portalPath('/payments')} onClick={() => setMenuOpen(false)} className={({ isActive }) => `block px-3 py-2 rounded-lg ${isActive ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-600 hover:bg-gray-50'}`}>
                Payments
              </NavLink>
              <button onClick={() => { logout(); setMenuOpen(false) }} className="block w-full text-left px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50">
                Logout
              </button>
            </>}
            {!token && (
              <NavLink to={portalPath('/login')} onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-primary-600 font-medium">
                Login
              </NavLink>
            )}
          </div>
        )}
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t mt-8 py-4 text-center text-xs text-gray-400">
        Built by{' '}
        <a href="https://samsbpm.ca" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
          SAMSBPM Technologies Inc
        </a>
      </footer>
    </div>
  )
}
