import axios from 'axios'
import { supabase } from './supabaseClient'

// We use relative path if we are on same domain, or explicit IP for testing
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://93.127.131.229:4001'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.error('API Interceptor Error:', error)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error)
  }
)
