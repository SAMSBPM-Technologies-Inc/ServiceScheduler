export type VendorRole = 'ADMIN' | 'WORKER'

export function getVendorRole(): VendorRole {
  return (localStorage.getItem('vendor_role') as VendorRole) || 'WORKER'
}

export function isAdmin(): boolean {
  return getVendorRole() === 'ADMIN'
}
