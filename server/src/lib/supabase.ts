import { createClient } from '@supabase/supabase-js'

let _supabase: ReturnType<typeof createClient> | null = null
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (_supabase) return _supabase

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')
  if (!supabaseAnonKey) throw new Error('Missing SUPABASE_ANON_KEY')

  _supabase = createClient(supabaseUrl, supabaseAnonKey)
  return _supabase
}

export function getSupabaseForUser(token: string) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')
  if (!supabaseAnonKey) throw new Error('Missing SUPABASE_ANON_KEY')

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  })
}

export function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')
  if (!supabaseServiceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)
  return _supabaseAdmin
}
