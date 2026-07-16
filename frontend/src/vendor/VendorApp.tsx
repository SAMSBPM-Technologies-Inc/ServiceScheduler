import { Routes, Route, Navigate } from 'react-router-dom'
import VendorLogin from './pages/VendorLogin'
import VendorRegister from './pages/VendorRegister'
import VendorLayout from './VendorLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Plans from './pages/Plans'
import PlanBuilder from './pages/PlanBuilder'
import Subscriptions from './pages/Subscriptions'
import SubscriptionDetail from './pages/SubscriptionDetail'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'

function RequireVendorAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('vendor_token')
  if (!token) return <Navigate to="/vendor/login" replace />
  return <>{children}</>
}

export default function VendorApp() {
  return (
    <Routes>
      <Route path="login" element={<VendorLogin />} />
      <Route path="register" element={<VendorRegister />} />
      <Route path="/*" element={
        <RequireVendorAuth>
          <VendorLayout />
        </RequireVendorAuth>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="plans" element={<Plans />} />
        <Route path="plans/new" element={<PlanBuilder />} />
        <Route path="plans/:id/edit" element={<PlanBuilder />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="subscriptions/:id" element={<SubscriptionDetail />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
      </Route>
    </Routes>
  )
}
