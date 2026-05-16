import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import ExcelJS from 'exceljs'
import { z } from 'zod'
import createDOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'
import CryptoJS from 'crypto-js'
import { initFirebaseAdmin } from './lib/firebase'
import { getSupabase, getSupabaseAdmin, getSupabaseForUser } from './lib/supabase'
import { requireAuth } from './middleware/requireAuth'

dotenv.config()
const app = express()
const window = new JSDOM('').window
const DOMPurify = createDOMPurify(window as any)

const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET || 'TUVMS-SUPER-SECRET-KEY-2026'

const Vault = {
  encrypt: (data: string) => {
    if (!data) return data
    return CryptoJS.AES.encrypt(data + '_salt_' + CryptoJS.lib.WordArray.random(16), ENCRYPTION_KEY).toString()
  },
  decrypt: (cipher: string) => {
    if (!cipher || cipher.length < 10) return cipher
    try {
      const bytes = CryptoJS.AES.decrypt(cipher, ENCRYPTION_KEY)
      const decrypted = bytes.toString(CryptoJS.enc.Utf8)
      return decrypted.split('_salt_')[0]
    } catch { return '******' }
  }
}

const maskData = (val: string, type: 'phone' | 'email' | 'id') => {
  if (!val) return '—'
  if (type === 'phone') return val.slice(0, 7) + '****' + val.slice(-2)
  if (type === 'email') {
    const [name, domain] = val.split('@')
    return name.slice(0, 2) + '***@' + domain
  }
  return val.slice(0, 3) + '*****' + val.slice(-2)
}

const scrubUser = (user: any) => {
  if (!user) return user
  const sensitive = ['phone', 'university_id', 'national_id', 'email']
  const scrubbed = { ...user }
  sensitive.forEach(f => {
    if (scrubbed[f]) {
      const val = scrubbed[f].length > 40 ? Vault.decrypt(scrubbed[f]) : scrubbed[f]
      scrubbed[f] = maskData(val, f === 'email' ? 'email' : (f === 'phone' ? 'phone' : 'id'))
    }
  })
  return scrubbed
}

const sendSuccess = (res: Response, data: any, message = 'Success') => res.json({ ok: true, data, message })
const sendError = (res: Response, status: number, error: string) => res.status(status).json({ ok: false, error })

async function logAction(req: Request, action: string, targetId: string, details: any) {
  try {
    const admin = getSupabaseAdmin() as any
    const user = (req as any).user
    await admin.from('audit_logs').insert({ admin_id: user?.id, action, target_id: targetId, details, ip_address: req.ip || 'unknown' })
  } catch (err) { console.error('Audit fail:', err) }
}

async function getRoleForRequest(req: Request) {
  return (req as any)?.profile?.role || 'volunteer'
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}))

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  next();
});

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// --- PUBLIC ROUTES ---
app.get('/api/public/events', async (req, res) => {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('events').select('*').eq('is_visible', true).order('date', { ascending: true })
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

// --- USER ROUTES ---
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('users').select('*').eq('id', user.id).single()
    if (error) throw error
    sendSuccess(res, scrubUser(data))
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/me/stats', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const [regs, attend, badges] = await Promise.all([
      admin.from('registrations').select('id', { count: 'exact' }).eq('user_id', user.id),
      admin.from('attendance').select('id', { count: 'exact' }).eq('user_id', user.id).not('check_in', 'is', null),
      admin.from('user_badges').select('id', { count: 'exact' }).eq('user_id', user.id)
    ])
    sendSuccess(res, { eventsCount: regs.count || 0, attendanceCount: attend.count || 0, badgesCount: badges.count || 0, totalHours: (attend.count || 0) * 2 })
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const role = await getRoleForRequest(req)
    const isAdmin = role === 'admin' || role === 'organizer'
    const admin = getSupabaseAdmin() as any
    
    const { data: all, error } = await admin.from('events').select('*').order('created_at', { ascending: false })
    if (error) throw error
    
    const { data: myRegs } = await admin.from('registrations').select('event_id').eq('user_id', user.id)
    const myRegIds = new Set((myRegs || []).map((r: any) => String(r.event_id)))
    
    const filtered = all.filter((ev: any) => {
      if (isAdmin) return true
      if (myRegIds.has(String(ev.id))) return true
      return ev.is_visible !== false
    })
    sendSuccess(res, filtered)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/me/registrations', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('registrations').select('event_id, created_at').eq('user_id', user.id)
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/me/badges', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('user_badges').select('id, badge:badges(*)').eq('user_id', user.id)
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/me/certificates', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('certificates').select('*, event:events(title, date, description)').eq('user_id', user.id)
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/events/:eventId/availability', requireAuth, async (req, res) => {
  try {
    const admin = getSupabaseAdmin() as any
    const { data: event } = await admin.from('events').select('capacity').eq('id', req.params.eventId).single()
    const { count } = await admin.from('registrations').select('id', { count: 'exact' }).eq('event_id', req.params.eventId)
    sendSuccess(res, { capacity: event?.capacity || 0, registeredCount: count || 0, isFull: (count || 0) >= (event?.capacity || 0) })
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.post('/api/events/:eventId/register', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user
    const admin = getSupabaseAdmin() as any
    const { data: ev } = await admin.from('events').select('*').eq('id', req.params.eventId).single()
    if (ev?.is_closed) return sendError(res, 400, 'Registration closed')
    const { data, error } = await admin.from('registrations').insert({ user_id: user.id, event_id: req.params.eventId, token: Math.random().toString(36) }).select().single()
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

// --- ADMIN ROUTES ---
app.get('/api/admin/events', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('events').select('*').order('created_at', { ascending: false })
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/admin/events/:eventId', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('events').select('*').eq('id', req.params.eventId).single()
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.post('/api/admin/events/:eventId/settings', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const { is_visible, is_closed, admin_tag, certificate_text } = req.body
    const patch: any = {}
    if (is_visible !== undefined) patch.is_visible = !!is_visible
    if (is_closed !== undefined) patch.is_closed = !!is_closed
    if (admin_tag !== undefined) patch.admin_tag = admin_tag
    if (certificate_text !== undefined) patch.certificate_text = certificate_text
    
    const { data, error } = await admin.from('events').update(patch).eq('id', req.params.eventId).select().single()
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/admin/users', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('users').select('*').order('created_at', { ascending: false })
    if (error) throw error
    sendSuccess(res, data.map((u: any) => scrubUser(u)))
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/admin/badges', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const { data, error } = await admin.from('badges').select('*').order('created_at', { ascending: false })
    if (error) throw error
    sendSuccess(res, data)
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/api/admin/stats', requireAuth, async (req, res) => {
  if ((req as any).profile.role !== 'admin') return sendError(res, 403, 'Forbidden')
  try {
    const admin = getSupabaseAdmin() as any
    const [u, e, r, a] = await Promise.all([
      admin.from('users').select('id', { count: 'exact' }),
      admin.from('events').select('id', { count: 'exact' }),
      admin.from('registrations').select('id', { count: 'exact' }),
      admin.from('attendance').select('id', { count: 'exact' })
    ])
    sendSuccess(res, { totalUsers: u.count || 0, totalEvents: e.count || 0, totalRegistrations: r.count || 0, totalAttendance: a.count || 0 })
  } catch (e: any) { sendError(res, 500, e.message) }
})

app.get('/health', (req, res) => res.json({ ok: true }))

const PORT = 4001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] ready on port ${PORT}`)
  initFirebaseAdmin()
})
