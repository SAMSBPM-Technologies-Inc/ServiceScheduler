import { useQuery } from '@tanstack/react-query'
import { customerApi } from '../../lib/api'

export default function PaymentHistory() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => customerApi.get('/payments/history').then(r => r.data.payments),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Payment History</h1>
      {isLoading && <p className="text-gray-400">Loading...</p>}
      <div className="card">
        {payments?.length === 0 && <p className="text-center text-gray-400 py-8">No payments yet.</p>}
        <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[500px]">
          <thead><tr className="border-b text-gray-500 text-left">
            <th className="pb-2 font-medium">Vendor</th><th className="pb-2 font-medium">Plan</th>
            <th className="pb-2 font-medium">Period</th><th className="pb-2 font-medium">Amount</th>
            <th className="pb-2 font-medium">Status</th><th className="pb-2 font-medium">Paid At</th>
          </tr></thead>
          <tbody>
            {payments?.map((p: any) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="py-3">{p.subscription?.vendor?.name}</td>
                <td className="py-3">{p.subscription?.plan?.name}</td>
                <td className="py-3">{p.billingPeriod}</td>
                <td className="py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                <td className="py-3"><span className={`badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                <td className="py-3 text-gray-400">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
