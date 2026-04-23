import type { NextFunction, Request, Response } from 'express'
import { getSupabase } from '../lib/supabase'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization

  if (!auth?.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ ok: false, error: 'Missing Authorization Bearer token' })
  }

  const token = auth.slice('bearer '.length).trim()

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: 'Invalid token' })
    }

    try {
      const uid = data.user.id
      const { data: profile } = (await (supabase as any)
        .from('users')
        .select('role,membership_status')
        .eq('id', uid)
        .maybeSingle()) as any

      const role = String(profile?.role ?? 'volunteer')
      const membershipStatus = String(profile?.membership_status ?? '')

      if (role !== 'admin' && (membershipStatus === 'suspended' || membershipStatus === 'revoked')) {
        return res.status(403).json({
          ok: false,
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
          membership_status: membershipStatus
        })
      }
    } catch {
      // ignore and allow request if profile lookup fails
    }

    ;(req as any).user = data.user
    return next()
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Auth verification failed' })
  }
}
