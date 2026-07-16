import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const vendorApi = axios.create({ baseURL: `${API_BASE}/api` })
export const customerApi = axios.create({ baseURL: `${API_BASE}/api` })

vendorApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('vendor_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('customer_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

vendorApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('vendor_token')
      window.location.href = '/vendor/login'
    }
    return Promise.reject(err)
  }
)

customerApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('customer_token')
    }
    return Promise.reject(err)
  }
)
