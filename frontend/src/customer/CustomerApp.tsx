import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import CustomerLogin from './pages/CustomerLogin'
import CustomerRegister from './pages/CustomerRegister'
import CustomerLayout from './CustomerLayout'
import BrowsePlans from './pages/BrowsePlans'
import SubscribePlan from './pages/SubscribePlan'
import MySubscriptions from './pages/MySubscriptions'
import SubscriptionDetail from './pages/CustomerSubscriptionDetail'
import PaymentHistory from './pages/PaymentHistory'

function RequireCustomerAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('customer_token')
  const { slug } = useParams()
  if (!token) return <Navigate to={`/portal/${slug}/login`} replace />
  return <>{children}</>
}

export default function CustomerApp() {
  return (
    <Routes>
      <Route path=":slug/login" element={<CustomerLogin />} />
      <Route path=":slug/register" element={<CustomerRegister />} />
      <Route path=":slug/*" element={<CustomerLayout />}>
        <Route index element={<BrowsePlans />} />
        <Route path="plans" element={<BrowsePlans />} />
        <Route path="plans/:planId/subscribe" element={
          <RequireCustomerAuth><SubscribePlan /></RequireCustomerAuth>
        } />
        <Route path="subscriptions" element={
          <RequireCustomerAuth><MySubscriptions /></RequireCustomerAuth>
        } />
        <Route path="subscriptions/:subId" element={
          <RequireCustomerAuth><SubscriptionDetail /></RequireCustomerAuth>
        } />
        <Route path="payments" element={
          <RequireCustomerAuth><PaymentHistory /></RequireCustomerAuth>
        } />
      </Route>
    </Routes>
  )
}
