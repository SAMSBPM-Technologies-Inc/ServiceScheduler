import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vendorApi } from '../lib/api'
import { getVendorRole } from '../lib/useVendorRole'
import { LayoutDashboard, Package, ClipboardList, Users, Bell, BarChart2, Settings, LogOut, UserCog } from 'lucide-react'

const allNav = [
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
  { to: 'products', label: 'Products', icon: Package, adminOnly: false },
  { to: 'plans', label: 'Plans', icon: ClipboardList, adminOnly: false },
  { to: 'subscriptions', label: 'Subscriptions', icon: Users, adminOnly: false },
  { to: 'alerts', label: 'Alerts', icon: Bell, adminOnly: false },
  { to: 'reports', label: 'Reports', icon: BarChart2, adminOnly: false },
  { to: 'team', label: 'Team', icon: UserCog, adminOnly: true },
  { to: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
]

export default function VendorLayout() {
  const navigate = useNavigate()
  const role = getVendorRole()
  const isAdmin = role === 'ADMIN'
  const { data } = useQuery({ queryKey: ['vendor-me'], queryFn: () => vendorApi.get('/vendor/auth/me').then(r => r.data.vendor) })

  const nav = allNav.filter(item => !item.adminOnly || isAdmin)

  function logout() {
    localStorage.removeItem('vendor_token')
    localStorage.removeItem('vendor_role')
    navigate('/vendor/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-vendor-600 text-white flex flex-col">
        <div className="p-5 border-b border-vendor-700">
          <div className="font-bold text-lg">ServiceScheduler</div>
          <div className="text-vendor-100 text-sm mt-1 truncate">{data?.name || 'Vendor Dashboard'}</div>
          {!isAdmin && (
            <div className="mt-1 text-xs text-vendor-200 bg-vendor-700 rounded px-2 py-0.5 inline-block">Worker</div>
          )}
        </div>
        <nav className="flex-1 py-4 px-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm transition-colors ${isActive ? 'bg-vendor-700 text-white' : 'text-vendor-100 hover:bg-vendor-700 hover:text-white'}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-3 px-5 py-4 text-vendor-100 hover:text-white border-t border-vendor-700 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
