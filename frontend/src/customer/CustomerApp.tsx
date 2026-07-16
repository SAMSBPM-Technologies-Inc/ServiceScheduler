import { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CustomerLogin from './pages/CustomerLogin'
import CustomerRegister from './pages/CustomerRegister'
import CustomerLayout from './CustomerLayout'
import BrowsePlans from './pages/BrowsePlans'
import SubscribePlan from './pages/SubscribePlan'
import MySubscriptions from './pages/MySubscriptions'
import SubscriptionDetail from './pages/CustomerSubscriptionDetail'
import PaymentHistory from './pages/PaymentHistory'
import { VendorContext, usePortalPath } from '../lib/VendorContext'

function RequireCustomerAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('customer_token')
  const portalPath = usePortalPath()
  if (!token) return <Navigate to={portalPath('/login')} replace />
  return <>{children}</>
}

export default function CustomerApp() {
  const { isCustomDomain } = useContext(VendorContext)

  if (isCustomDomain) {
    return (
      <Routes>
        <Route path="login" element={<CustomerLogin />} />
        <Route path="register" element={<CustomerRegister />} />
        <Route path="/*" element={<CustomerLayout />}>
          <Route index element={<BrowsePlans />} />
          <Route path="plans" element={<BrowsePlans />} />
          <Route path="plans/:planId/subscribe" element={<RequireCustomerAuth><SubscribePlan /></RequireCustomerAuth>} />
          <Route path="subscriptions" element={<RequireCustomerAuth><MySubscriptions /></RequireCustomerAuth>} />
          <Route path="subscriptions/:subId" element={<RequireCustomerAuth><SubscriptionDetail /></RequireCustomerAuth>} />
          <Route path="payments" element={<RequireCustomerAuth><PaymentHistory /></RequireCustomerAuth>} />
        </Route>
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path=":slug/login" element={<CustomerLogin />} />
      <Route path=":slug/register" element={<CustomerRegister />} />
      <Route path=":slug/*" element={<CustomerLayout />}>
        <Route index element={<BrowsePlans />} />
        <Route path="plans" element={<BrowsePlans />} />
        <Route path="plans/:planId/subscribe" element={<RequireCustomerAuth><SubscribePlan /></RequireCustomerAuth>} />
        <Route path="subscriptions" element={<RequireCustomerAuth><MySubscriptions /></RequireCustomerAuth>} />
        <Route path="subscriptions/:subId" element={<RequireCustomerAuth><SubscriptionDetail /></RequireCustomerAuth>} />
        <Route path="payments" element={<RequireCustomerAuth><PaymentHistory /></RequireCustomerAuth>} />
      </Route>
    </Routes>
  )
}
