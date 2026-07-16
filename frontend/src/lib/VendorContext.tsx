import { createContext, useContext } from 'react'
import { useParams } from 'react-router-dom'

interface VendorContextValue {
  slug: string
  isCustomDomain: boolean
}

export const VendorContext = createContext<VendorContextValue>({ slug: '', isCustomDomain: false })

export function VendorProvider({ slug, isCustomDomain, children }: {
  slug: string
  isCustomDomain: boolean
  children: React.ReactNode
}) {
  return <VendorContext.Provider value={{ slug, isCustomDomain }}>{children}</VendorContext.Provider>
}

export function useVendorSlug(): string {
  const params = useParams<{ slug?: string }>()
  const { slug: contextSlug } = useContext(VendorContext)
  return params.slug || contextSlug
}

export function usePortalPath() {
  const params = useParams<{ slug?: string }>()
  const { slug: contextSlug, isCustomDomain } = useContext(VendorContext)
  const slug = params.slug || contextSlug
  return (path: string) => isCustomDomain ? path || '/' : `/portal/${slug}${path}`
}
