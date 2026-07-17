import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { VendorProvider } from './lib/VendorContext'
import VendorApp from './vendor/VendorApp'
import CustomerApp from './customer/CustomerApp'
import AdminApp from './admin/AdminApp'
import { customerApi } from './lib/api'

export default function App() {
  const [vendorSlug, setVendorSlug] = useState('')
  const [isCustomDomain, setIsCustomDomain] = useState(false)
  const [domainChecked, setDomainChecked] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      setDomainChecked(true)
      return
    }
    customerApi.get(`/portal/by-domain?domain=${hostname}`)
      .then(r => {
        setVendorSlug(r.data.vendor.slug)
        setIsCustomDomain(true)
      })
      .catch(() => {})
      .finally(() => setDomainChecked(true))
  }, [])

  if (!domainChecked) return null

  return (
    <VendorProvider slug={vendorSlug} isCustomDomain={isCustomDomain}>
      <Routes>
        {isCustomDomain ? (
          <Route path="/*" element={<CustomerApp />} />
        ) : (
          <>
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/vendor/*" element={<VendorApp />} />
            <Route path="/portal/*" element={<CustomerApp />} />
            <Route path="/" element={<Navigate to="/vendor/login" replace />} />
          </>
        )}
      </Routes>
    </VendorProvider>
  )
}
