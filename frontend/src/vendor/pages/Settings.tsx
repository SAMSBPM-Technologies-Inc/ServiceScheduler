import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'

export default function Settings() {
  const qc = useQueryClient()
  const [domain, setDomain] = useState('')
  const [domainSaved, setDomainSaved] = useState(false)
  const [stripeKey, setStripeKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [stripeSaved, setStripeSaved] = useState(false)

  const { data: vendor } = useQuery({
    queryKey: ['vendor-me'],
    queryFn: () => vendorApi.get('/vendor/auth/me').then(r => r.data.vendor),
  })

  const { data: stripeStatus } = useQuery({
    queryKey: ['vendor-stripe-status'],
    queryFn: () => vendorApi.get('/vendor/auth/stripe').then(r => r.data),
  })

  useEffect(() => {
    if (vendor !== undefined) setDomain(vendor?.customDomain || '')
  }, [vendor?.customDomain])

  const saveDomain = useMutation({
    mutationFn: (customDomain: string) => vendorApi.put('/vendor/auth/domain', { customDomain: customDomain || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-me'] }); setDomainSaved(true) },
  })

  const saveStripe = useMutation({
    mutationFn: () => vendorApi.put('/vendor/auth/stripe', {
      stripeSecretKey: stripeKey.trim() || '',
      stripeWebhookSecret: webhookSecret.trim() || '',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-stripe-status'] }); setStripeSaved(true); setStripeKey(''); setWebhookSecret('') },
  })

  return (
    <div className="p-4 sm:p-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Custom Domain */}
      <div className="card w-full max-w-lg">
        <h2 className="font-semibold mb-2">Custom Domain</h2>
        <p className="text-sm text-gray-500 mb-4">
          Point your domain's DNS CNAME to this app's hostname, then enter the domain below.
          Customers visiting that domain will see your portal directly without the <code className="bg-gray-100 px-1 rounded">/portal/slug</code> prefix.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            placeholder="e.g. portal.yourbusiness.com"
            value={domain}
            onChange={e => { setDomain(e.target.value); setDomainSaved(false) }}
          />
          <button
            className="btn-primary"
            onClick={() => saveDomain.mutate(domain.trim().toLowerCase())}
            disabled={saveDomain.isPending}
          >
            {saveDomain.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
        {domainSaved && <p className="text-green-600 text-sm mt-2">Domain saved!</p>}
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

      {/* Stripe Keys */}
      <div className="card w-full max-w-lg">
        <h2 className="font-semibold mb-2">Stripe Integration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter your own Stripe keys so payments go directly to your Stripe account.
          Leave blank to use the platform's default Stripe account.
        </p>
        <div className="mb-3 text-sm text-gray-600 flex gap-4">
          <span>Secret key: {stripeStatus?.hasStripeKey ? <span className="text-green-600 font-medium">Configured</span> : <span className="text-gray-400">Not set</span>}</span>
          <span>Webhook secret: {stripeStatus?.hasWebhookSecret ? <span className="text-green-600 font-medium">Configured</span> : <span className="text-gray-400">Not set</span>}</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Stripe Secret Key</label>
            <input
              className="input font-mono text-sm"
              type="password"
              placeholder="sk_live_... (leave blank to keep current)"
              value={stripeKey}
              onChange={e => { setStripeKey(e.target.value); setStripeSaved(false) }}
            />
          </div>
          <div>
            <label className="label">Stripe Webhook Secret</label>
            <input
              className="input font-mono text-sm"
              type="password"
              placeholder="whsec_... (leave blank to keep current)"
              value={webhookSecret}
              onChange={e => { setWebhookSecret(e.target.value); setStripeSaved(false) }}
            />
          </div>
          {stripeStatus?.hasStripeKey && vendor?.id && (
            <p className="text-xs text-gray-500">
              Webhook URL for Stripe dashboard: <code className="bg-gray-100 px-1 rounded">{`/api/payments/webhook/${vendor.id}`}</code>
            </p>
          )}
          <button
            className="btn-primary"
            onClick={() => saveStripe.mutate()}
            disabled={saveStripe.isPending}
          >
            {saveStripe.isPending ? 'Saving...' : 'Save Stripe Keys'}
          </button>
          {stripeSaved && <p className="text-green-600 text-sm">Stripe keys saved!</p>}
          {saveStripe.isError && <p className="text-red-600 text-sm">Failed to save Stripe keys.</p>}
        </div>
      </div>
    </div>
  )
}
