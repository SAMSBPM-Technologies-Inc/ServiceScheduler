import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'

export default function Settings() {
  const qc = useQueryClient()
  const [domain, setDomain] = useState('')
  const [saved, setSaved] = useState(false)

  const { data: vendor } = useQuery({
    queryKey: ['vendor-me'],
    queryFn: () => vendorApi.get('/vendor/auth/me').then(r => r.data.vendor),
  })

  useEffect(() => {
    if (vendor !== undefined) setDomain(vendor?.customDomain || '')
  }, [vendor?.customDomain])

  const saveDomain = useMutation({
    mutationFn: (customDomain: string) => vendorApi.put('/vendor/auth/domain', { customDomain: customDomain || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-me'] }); setSaved(true) },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="card max-w-lg">
        <h2 className="font-semibold mb-2">Custom Domain</h2>
        <p className="text-sm text-gray-500 mb-4">
          Point your domain's DNS CNAME to this app's hostname, then enter the domain below.
          Customers visiting that domain will see your portal directly without the <code className="bg-gray-100 px-1 rounded">/portal/slug</code> prefix.
        </p>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. portal.yourbusiness.com"
            value={domain}
            onChange={e => { setDomain(e.target.value); setSaved(false) }}
          />
          <button
            className="btn-primary"
            onClick={() => saveDomain.mutate(domain.trim().toLowerCase())}
            disabled={saveDomain.isPending}
          >
            {saveDomain.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
        {saved && <p className="text-green-600 text-sm mt-2">Domain saved!</p>}
        {saveDomain.isError && <p className="text-red-600 text-sm mt-2">Failed to save — domain may already be in use.</p>}
        {vendor?.customDomain && (
          <div className="mt-4 text-sm text-gray-600 flex items-center gap-2">
            Active:
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{vendor.customDomain}</span>
            <button
              className="text-red-500 hover:underline text-xs ml-1"
              onClick={() => { setDomain(''); saveDomain.mutate('') }}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
