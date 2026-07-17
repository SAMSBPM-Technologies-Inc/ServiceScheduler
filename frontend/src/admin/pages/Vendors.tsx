import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { platformApi } from '../../lib/adminApi'
import { Building2, Users, BookOpen, ChevronRight } from 'lucide-react'

export default function Vendors() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['platform-vendors'],
    queryFn: () => platformApi.get('/platform/vendors').then(r => r.data.vendors),
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Vendors</h1>

      {isLoading && <p className="text-gray-400">Loading...</p>}

      <div className="grid gap-3">
        {data?.map((v: any) => (
          <div
            key={v.id}
            onClick={() => navigate(`/admin/vendors/${v.id}`)}
            className="bg-white border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-primary-300 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
              {v.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{v.name}</div>
              <div className="text-sm text-gray-500 truncate">{v.email}</div>
              {v.customDomain && <div className="text-xs text-primary-600 mt-0.5">{v.customDomain}</div>}
            </div>
            <div className="flex items-center gap-5 text-sm text-gray-500 flex-shrink-0">
              <div className="flex items-center gap-1.5"><BookOpen size={14} />{v._count.plans} plans</div>
              <div className="flex items-center gap-1.5"><Users size={14} />{v._count.vendorUsers} team</div>
              <div className="flex items-center gap-1.5"><Building2 size={14} />{v._count.subscriptions} subs</div>
              <div className="text-xs text-gray-300">{new Date(v.createdAt).toLocaleDateString()}</div>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </div>
        ))}
        {!isLoading && data?.length === 0 && (
          <p className="text-center text-gray-400 py-12">No vendors yet.</p>
        )}
      </div>
    </div>
  )
}
