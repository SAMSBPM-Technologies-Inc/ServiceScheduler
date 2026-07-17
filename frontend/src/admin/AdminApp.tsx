import { Routes, Route, Navigate } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminLayout from './AdminLayout'
import Vendors from './pages/Vendors'
import VendorDetail from './pages/VendorDetail'
import Customers from './pages/Customers'

function RequirePlatformAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('platform_token')
  if (!token) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route path="/*" element={
        <RequirePlatformAuth>
          <AdminLayout />
        </RequirePlatformAuth>
      }>
        <Route index element={<Navigate to="vendors" replace />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/:id" element={<VendorDetail />} />
        <Route path="customers" element={<Customers />} />
      </Route>
    </Routes>
  )
}
