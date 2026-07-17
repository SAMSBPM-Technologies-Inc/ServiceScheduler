import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Building2, Users, LogOut } from 'lucide-react'

const nav = [
  { to: '/admin/vendors', icon: Building2, label: 'Vendors' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const admin = JSON.parse(localStorage.getItem('platform_admin') || '{}')

  const logout = () => {
    localStorage.removeItem('platform_token')
    localStorage.removeItem('platform_admin')
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col flex-shrink-0">
        <div className="px-4 py-5 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-gray-900 font-black text-xs">P</span>
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">ServStack</div>
              <div className="text-xs text-gray-400 leading-tight">Platform Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2 truncate">{admin.email}</div>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="flex-1 p-8">
          <Outlet />
        </div>
        <footer className="border-t py-3 px-8 text-xs text-gray-400 text-center">
          Built by{' '}
          <a href="https://samsbpm.ca" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 underline">
            SAMSBPM Technologies Inc
          </a>
        </footer>
      </main>
    </div>
  )
}
