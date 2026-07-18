import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorApi } from '../../lib/api'
import { Plus, Check, Trash2 } from 'lucide-react'

export default function Alerts() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'log' | 'rules'>('log')
  const [showRuleForm, setShowRuleForm] = useState(false)
  const [ruleForm, setRuleForm] = useState({ name: '', trigger: 'DAYS_BEFORE_RENEWAL', daysOffset: 3, message: '', active: true })

  const { data: alerts } = useQuery({ queryKey: ['vendor-alerts'], queryFn: () => vendorApi.get('/vendor/alerts').then(r => r.data.alerts) })
  const { data: rules } = useQuery({ queryKey: ['vendor-alert-rules'], queryFn: () => vendorApi.get('/vendor/alerts/rules').then(r => r.data.rules) })

  const markRead = useMutation({
    mutationFn: (id: string) => vendorApi.patch(`/vendor/alerts/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-alerts'] }),
  })
  const createRule = useMutation({
    mutationFn: () => vendorApi.post('/vendor/alerts/rules', ruleForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendor-alert-rules'] }); setShowRuleForm(false) },
  })
  const deleteRule = useMutation({
    mutationFn: (id: string) => vendorApi.delete(`/vendor/alerts/rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendor-alert-rules'] }),
  })

  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Alerts & Reminders</h1>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('log')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'log' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Alert Log</button>
        <button onClick={() => setTab('rules')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'rules' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Alert Rules</button>
      </div>

      {tab === 'log' && (
        <div className="card">
          {alerts?.map((a: any) => (
            <div key={a.id} className={`flex items-start gap-3 py-3 border-b last:border-0 ${a.read ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <div className="text-sm font-medium">{a.message}</div>
                <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()} · {a.type}</div>
              </div>
              {!a.read && (
                <button onClick={() => markRead.mutate(a.id)} className="text-green-500 hover:text-green-700 p-1"><Check size={15} /></button>
              )}
            </div>
          ))}
          {alerts?.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No alerts.</p>}
        </div>
      )}

      {tab === 'rules' && (
        <div className="card">
          <div className="flex justify-end mb-4">
            <button className="btn-primary flex items-center gap-2" onClick={() => setShowRuleForm(!showRuleForm)}><Plus size={16} /> Add Rule</button>
          </div>
          {showRuleForm && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="label">Rule Name</label><input className="input" value={ruleForm.name} onChange={e => setRuleForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><label className="label">Trigger</label>
                  <select className="input" value={ruleForm.trigger} onChange={e => setRuleForm(f => ({ ...f, trigger: e.target.value }))}>
                    <option value="DAYS_BEFORE_RENEWAL">Days before renewal</option>
                    <option value="PRODUCT_OUT_OF_STOCK">Product out of stock</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                {ruleForm.trigger === 'DAYS_BEFORE_RENEWAL' && (
                  <div><label className="label">Days Before</label><input className="input" type="number" value={ruleForm.daysOffset} onChange={e => setRuleForm(f => ({ ...f, daysOffset: parseInt(e.target.value) }))} /></div>
                )}
                <div className="col-span-2"><label className="label">Message</label><input className="input" value={ruleForm.message} onChange={e => setRuleForm(f => ({ ...f, message: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => createRule.mutate()} disabled={createRule.isPending}>Save Rule</button>
                <button className="btn-secondary" onClick={() => setShowRuleForm(false)}>Cancel</button>
              </div>
            </div>
          )}
          {rules?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <div className="text-sm font-medium">{r.name}</div>
                <div className="text-xs text-gray-400">{r.trigger}{r.daysOffset ? ` (${r.daysOffset} days)` : ''} — {r.message}</div>
              </div>
              <button onClick={() => deleteRule.mutate(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
            </div>
          ))}
          {rules?.length === 0 && !showRuleForm && <p className="text-gray-400 text-sm text-center py-6">No alert rules.</p>}
        </div>
      )}
    </div>
  )
}
