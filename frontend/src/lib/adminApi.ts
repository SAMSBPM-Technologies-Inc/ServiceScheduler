import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const platformApi = axios.create({ baseURL: `${API_BASE}/api` })

platformApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('platform_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

platformApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('platform_token')
      localStorage.removeItem('platform_admin')
      window.location.href = '/admin/login'
    }
    return Promise.reject(err)
  }
)
