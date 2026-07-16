import { Routes, Route, Navigate } from 'react-router-dom'
import VendorApp from './vendor/VendorApp'
import CustomerApp from './customer/CustomerApp'

export default function App() {
  return (
    <Routes>
      <Route path="/vendor/*" element={<VendorApp />} />
      <Route path="/portal/*" element={<CustomerApp />} />
      <Route path="/" element={<Navigate to="/vendor/login" replace />} />
    </Routes>
  )
}
