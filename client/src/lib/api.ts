import axios from 'axios'
import { supabase } from '@/lib/supabaseClient'

const envBaseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (process.env as any).NEXT_PUBLIC_API_BASE ??
  'http://localhost:4000'

const resolvedBaseURL = (() => {
  if (typeof window === 'undefined') return envBaseURL
  const host = window.location.hostname
  const isLocalHost = host === 'localhost' || host === '127.0.0.1'
  const pointsToLocal = /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/i.test(envBaseURL)
  if (!isLocalHost && pointsToLocal) {
    return `https://api.${host}`
  }
  return envBaseURL
})()

export const api = axios.create({
  baseURL: resolvedBaseURL
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    try {
      const code = err?.response?.data?.code
      if (code === 'ACCOUNT_SUSPENDED' && typeof window !== 'undefined') {
        if (window.location.pathname !== '/account-suspended') {
          window.location.href = '/account-suspended'
        }
      }
    } catch {

    }
    return Promise.reject(err)
  }
)

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
