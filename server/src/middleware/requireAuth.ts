import type { NextFunction, Request, Response } from 'express'
import { getSupabase, getSupabaseAdmin } from '../lib/supabase'
import { getSupabaseForUser } from '../lib/supabase'

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

    const confirmedAt = (data.user as any)?.email_confirmed_at ?? (data.user as any)?.confirmed_at ?? null
    if (!confirmedAt) {
      return res.status(403).json({
        ok: false,
        error: 'Email not confirmed',
        code: 'EMAIL_NOT_CONFIRMED'
      })
    }

    const uid = data.user.id
    try {
      const admin = getSupabaseAdmin()
      const { data: profile } = (await (admin as any)
        .from('users')
        .select('role,membership_status')
        .eq('id', uid)
        .maybeSingle()) as any

      const role = String(profile?.role ?? 'volunteer')
      const membershipStatus = String(profile?.membership_status ?? '')

      ;(req as any).profile = { role, membership_status: membershipStatus }

      if (role !== 'admin' && (membershipStatus === 'suspended' || membershipStatus === 'revoked')) {
        return res.status(403).json({
          ok: false,
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
          membership_status: membershipStatus
        })
      }
    } catch {
      try {
        const supabaseUser = getSupabaseForUser(token)
        const { data: profile } = (await (supabaseUser as any)
          .from('users')
          .select('role,membership_status')
          .eq('id', uid)
          .maybeSingle()) as any

        const role = String(profile?.role ?? 'volunteer')
        const membershipStatus = String(profile?.membership_status ?? '')
        ;(req as any).profile = { role, membership_status: membershipStatus }

        if (role !== 'admin' && (membershipStatus === 'suspended' || membershipStatus === 'revoked')) {
          return res.status(403).json({
            ok: false,
            error: 'Account suspended',
            code: 'ACCOUNT_SUSPENDED',
            membership_status: membershipStatus
          })
        }
      } catch {
        ;(req as any).profile = { role: 'volunteer', membership_status: '' }
      }
    }

    ;(req as any).user = data.user
    return next()
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'Auth verification failed' })
  }
}
