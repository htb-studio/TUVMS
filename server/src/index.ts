import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { initFirebaseAdmin } from './lib/firebase'
import { getSupabase, getSupabaseAdmin, getSupabaseForUser } from './lib/supabase'
import { requireAuth } from './middleware/requireAuth'

dotenv.config()

const app = express()

const isProd = process.env.NODE_ENV === 'production'

type RouteKey = `${string} ${string}`

type RouteStats = {
  count: number
  errorCount: number
  inflight: number
  latencyMsTotal: number
  latencyMsMax: number
  lastAt: number | null
}

const startedAtMs = Date.now()
const routeStats = new Map<RouteKey, RouteStats>()

function getOrInitRouteStats(key: RouteKey) {
  const cur = routeStats.get(key)
  if (cur) return cur
  const init: RouteStats = {
    count: 0,
    errorCount: 0,
    inflight: 0,
    latencyMsTotal: 0,
    latencyMsMax: 0,
    lastAt: null
  }
  routeStats.set(key, init)
  return init
}

function normalizePath(p: string) {
  return p
    .split('?')[0]
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ':id')
    .replace(/\b\d+\b/g, ':n')
}

function requireInternalMetrics(req: express.Request, res: express.Response) {
  const token = String(req.headers['x-metrics-token'] ?? '')
  const expected = String(process.env.METRICS_TOKEN ?? '')
  if (!expected || token !== expected) {
    res.status(404).json({ ok: false })
    return false
  }
  return true
}

function getRequestIp(req: express.Request) {
  const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
  return xff || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown'
}

function sendError(res: express.Response, status: number, error: string, details?: string) {
  if (!isProd && details) return res.status(status).json({ ok: false, error, details })
  return res.status(status).json({ ok: false, error })
}

// Basic security headers (lightweight alternative to helmet)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=()')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site')

  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains')
  }
  next()
})

// Request vitals for load monitoring
app.use((req, res, next) => {
  const start = process.hrtime.bigint()
  const path = normalizePath(req.originalUrl || req.url || '')
  const key = `${req.method.toUpperCase()} ${path}` as RouteKey
  const stats = getOrInitRouteStats(key)
  stats.count += 1
  stats.inflight += 1
  stats.lastAt = Date.now()

  res.on('finish', () => {
    const end = process.hrtime.bigint()
    const ms = Number(end - start) / 1e6
    stats.inflight = Math.max(0, stats.inflight - 1)
    stats.latencyMsTotal += ms
    stats.latencyMsMax = Math.max(stats.latencyMsMax, ms)
    if (res.statusCode >= 400) stats.errorCount += 1
  })

  next()
})

const allowedOrigins = new Set(
  [
    'https://athar.it.com',
    'http://athar.it.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ].filter(Boolean)
)

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (allowedOrigins.has(origin)) return cb(null, true)
      return cb(new Error('CORS blocked'), false)
    },
    credentials: true
  })
)

app.use(express.json({ limit: '1mb' }))

const firebase = initFirebaseAdmin()

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true })
})

app.get('/internal/vitals', (req, res) => {
  if (!requireInternalMetrics(req, res)) return

  const mem = process.memoryUsage()
  const uptimeMs = Date.now() - startedAtMs

  const routes = Array.from(routeStats.entries()).map(([k, v]) => {
    const avg = v.count > 0 ? v.latencyMsTotal / v.count : 0
    return {
      route: k,
      count: v.count,
      inflight: v.inflight,
      errorCount: v.errorCount,
      errorRate: v.count > 0 ? v.errorCount / v.count : 0,
      latencyMsAvg: avg,
      latencyMsMax: v.latencyMsMax,
      lastAt: v.lastAt
    }
  })

  routes.sort((a, b) => {
    const da = a.latencyMsAvg * a.count
    const db = b.latencyMsAvg * b.count
    return db - da
  })

  res.json({
    ok: true,
    now: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV ?? null
    },
    process: {
      pid: process.pid,
      uptimeMs,
      versions: process.versions
    },
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external
    },
    load: {
      cpuUsage: process.cpuUsage(),
      resourceUsage: process.resourceUsage?.() ?? null
    },
    routes
  })
})

function pickBearerToken(req: express.Request) {
  const auth = req.headers.authorization
  if (!auth?.toLowerCase().startsWith('bearer ')) return null
  return auth.slice('bearer '.length).trim()
}

async function getRoleForRequest(req: express.Request) {
  const token = pickBearerToken(req)
  if (!token) return null
  const supabase = getSupabase()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return null

  const supabaseUser = getSupabaseForUser(token)
  const { data: profile } = (await supabaseUser.from('users').select('role').eq('id', userData.user.id).maybeSingle()) as any
  return (profile?.role as string | undefined) ?? 'volunteer'
}

function randomToken() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
}

function rateLimit(opts: { windowMs: number; max: number; keyPrefix: string }) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  const { windowMs, max, keyPrefix } = opts
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getRequestIp(req)
    const now = Date.now()
    const key = `${keyPrefix}:${ip}`
    const cur = hits.get(key)
    if (!cur || cur.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }
    cur.count += 1
    if (cur.count > max) {
      const retryAfter = Math.max(0, Math.ceil((cur.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      return sendError(res, 429, 'Too many requests')
    }
    return next()
  }
}

// List events (authenticated)
app.get('/api/events', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  try {
    const supabaseUser = getSupabaseForUser(token)
    const { data, error } = await supabaseUser.from('events').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('Failed to load events:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load events', error.message)
    }
    return res.json({ ok: true, data })
  } catch (e: any) {
    console.error('Admin events route crashed:', e)
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Admin: user profile (full details)
app.get('/api/admin/users/:userId', rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const userId = String(req.params.userId)

  try {
    const supabase = getSupabase()
    const { data, error } = (await (supabase as any)
      .from('users')
      .select('id,email,full_name,role,created_at,phone,university_id,national_id,gender,department,college,academic_level,birth_date,membership_status')
      .eq('id', userId)
      .maybeSingle()) as any

    if (error) return sendError(res, 500, 'Failed to load user', error.message)
    if (!data) return res.status(404).json({ ok: false, error: 'User not found' })
    return res.json({ ok: true, data })
  } catch (e: any) {
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Admin: set membership status (active/suspended/revoked)
app.post('/api/admin/users/:userId/status', rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const userId = String(req.params.userId)
  const status = String(req.body?.membership_status ?? '')
  if (!['active', 'suspended', 'revoked', ''].includes(status)) {
    return res.status(400).json({ ok: false, error: 'Invalid membership_status' })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = (await (supabase as any)
      .from('users')
      .update({ membership_status: status || null })
      .eq('id', userId)
      .select('*')
      .maybeSingle()) as any

    if (error) return sendError(res, 500, 'Failed to update user', error.message)
    if (!data) return res.status(404).json({ ok: false, error: 'User not found' })
    return res.json({ ok: true, data })
  } catch (e: any) {
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Admin: generate Supabase password recovery link
app.post('/api/admin/users/:userId/reset-password', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const userId = String(req.params.userId)

  try {
    const supabase = getSupabase()
    const { data: userRow, error: userErr } = (await (supabase as any)
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle()) as any
    if (userErr) return sendError(res, 500, 'Failed to load user', userErr.message)
    const email = String(userRow?.email ?? '')
    if (!email) return res.status(400).json({ ok: false, error: 'User has no email' })

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
      type: 'recovery',
      email
    })

    if (error) {
      console.error('Failed to generate recovery link:', { message: error.message })
      return sendError(res, 500, 'Failed to generate recovery link', error.message)
    }

    return res.json({ ok: true, data: { email, action_link: (data as any)?.properties?.action_link ?? null } })
  } catch (e: any) {
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Admin: user attendance history (events attended)
app.get('/api/admin/users/:userId/attendance', rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  const userId = String(req.params.userId)

  try {
    const supabaseUser = getSupabaseForUser(token)
    const { data, error } = (await (supabaseUser as any)
      .from('attendance')
      .select('id,event_id,check_in,check_out,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as any

    if (error) return sendError(res, 500, 'Failed to load attendance', error.message)

    const eventIds = Array.from(new Set((data ?? []).map((r: any) => String(r.event_id))))
    const { data: events, error: eventsErr } = (await (supabaseUser as any)
      .from('events')
      .select('id,title,date,start_time,end_time')
      .in('id', eventIds)) as any

    if (eventsErr) return sendError(res, 500, 'Failed to load events', eventsErr.message)

    const map = new Map<string, any>()
    for (const ev of events ?? []) map.set(String(ev.id), ev)

    const rows = (data ?? []).map((r: any) => ({
      ...r,
      event: map.get(String(r.event_id)) ?? null
    }))

    return res.json({ ok: true, data: rows })
  } catch (e: any) {
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Volunteer: event availability (capacity vs registrations count)
app.get('/api/events/:eventId/availability', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  const eventId = String(req.params.eventId)

  try {
    const supabaseUser = getSupabaseForUser(token)
    const { data: event, error: eventErr } = (await supabaseUser
      .from('events')
      .select('id,capacity')
      .eq('id', eventId)
      .single()) as any
    if (eventErr || !event) return res.status(404).json({ ok: false, error: 'Event not found' })

    const { count, error: countErr } = await supabaseUser
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countErr) {
      console.error('Failed to count registrations (availability):', {
        code: (countErr as any).code,
        message: countErr.message,
        details: (countErr as any).details,
        hint: (countErr as any).hint
      })
      return sendError(res, 500, 'Failed to load availability', countErr.message)
    }

    const capacity = Number(event.capacity ?? 0)
    const registeredCount = typeof count === 'number' ? count : 0
    const isFull = capacity > 0 && registeredCount >= capacity

    return res.json({
      ok: true,
      data: {
        event_id: eventId,
        capacity,
        registeredCount,
        isFull,
        remaining: capacity > 0 ? Math.max(0, capacity - registeredCount) : null
      }
    })
  } catch (e: any) {
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Volunteer: list my registrations (for UI badges)
app.get('/api/me/registrations', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  try {
    const supabase = getSupabase()
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })

    const supabaseUser = getSupabaseForUser(token)

    const userId = userData.user.id
    const { data, error } = (await supabaseUser
      .from('registrations')
      .select('event_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as any

    if (error) {
      console.error('Failed to load registrations:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load registrations', error.message)
    }
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Organizer/Admin: fetch single event details (owned by organizer unless admin)
app.get('/api/organizer/events/:eventId', requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || (role !== 'organizer' && role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Forbidden' })
  }

  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  const eventId = String(req.params.eventId)

  try {
    const supabase = getSupabase()
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })

    const supabaseUser = getSupabaseForUser(token)

    const uid = userData.user.id

    const { data: eventRow, error: eventErr } = (await supabaseUser
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()) as any

    if (eventErr) {
      console.error('Failed to load organizer event:', {
        code: (eventErr as any).code,
        message: eventErr.message,
        details: (eventErr as any).details,
        hint: (eventErr as any).hint
      })
      return sendError(res, 500, 'Failed to load event', eventErr.message)
    }
    if (!eventRow) return res.status(404).json({ ok: false, error: 'Event not found' })

    if (role !== 'admin' && String(eventRow.created_by) !== String(uid)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' })
    }

    return res.json({ ok: true, data: eventRow })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Organizer/Admin: event attendance report
app.get('/api/organizer/events/:eventId/attendance', requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || (role !== 'organizer' && role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Forbidden' })
  }

  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  const eventId = String(req.params.eventId)

  try {
    const supabase = getSupabase()
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })

    const supabaseUser = getSupabaseForUser(token)

    const uid = userData.user.id

    const { data: eventRow, error: eventErr } = (await supabaseUser
      .from('events')
      .select('id,title,created_by')
      .eq('id', eventId)
      .maybeSingle()) as any

    if (eventErr) {
      console.error('Failed to load organizer event for attendance:', {
        code: (eventErr as any).code,
        message: eventErr.message,
        details: (eventErr as any).details,
        hint: (eventErr as any).hint
      })
      return sendError(res, 500, 'Failed to load event', eventErr.message)
    }
    if (!eventRow) return res.status(404).json({ ok: false, error: 'Event not found' })

    if (role !== 'admin' && String(eventRow.created_by) !== String(uid)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' })
    }

    const { data, error } = (await supabaseUser
      .from('attendance')
      .select('id,user_id,event_id,check_in,check_out,scanned_by,created_at')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })) as any

    if (error) {
      console.error('Failed to load attendance:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load attendance', error.message)
    }

    const userIds = Array.from(new Set((data ?? []).map((r: any) => String(r.user_id))))
    const { data: users, error: usersErr } = (await supabaseUser
      .from('users')
      .select('id,email,full_name')
      .in('id', userIds)) as any

    if (usersErr) {
      console.error('Failed to load users for attendance:', {
        code: (usersErr as any).code,
        message: usersErr.message,
        details: (usersErr as any).details,
        hint: (usersErr as any).hint
      })
      return sendError(res, 500, 'Failed to load users', usersErr.message)
    }

    const map = new Map<string, any>()
    for (const u of users ?? []) map.set(String(u.id), u)

    const enriched = (data ?? []).map((r: any) => {
      const u = map.get(String(r.user_id))
      return {
        ...r,
        user_email: u?.email ?? null,
        user_full_name: u?.full_name ?? null
      }
    })

    const checkedIn = enriched.filter((r: any) => !!r.check_in).length
    const checkedOut = enriched.filter((r: any) => !!r.check_out).length

    return res.json({
      ok: true,
      data: {
        event: eventRow,
        stats: { checked_in: checkedIn, checked_out: checkedOut, total: enriched.length },
        rows: enriched
      }
    })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Admin: list all users
app.get('/api/admin/users', rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  try {
    const supabase = getSupabase()
    const { data, error } = (await supabase
      .from('users')
      .select('id,email,full_name,role,created_at')
      .order('created_at', { ascending: false })) as any

    if (error) return sendError(res, 500, 'Failed to load users', error.message)
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Admin: set user role
app.post('/api/admin/users/:userId/role', rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const userId = String(req.params.userId)
  const newRole = String(req.body?.role ?? '')
  if (!['volunteer', 'organizer', 'admin'].includes(newRole)) {
    return res.status(400).json({ ok: false, error: 'Invalid role' })
  }

  try {
    const supabase = getSupabase()
    const table: any = (supabase as any).from('users')
    const { data, error } = (await table
      .update({ role: newRole })
      .eq('id', userId)
      .select('id,email,full_name,role,created_at')
      .maybeSingle()) as any

    if (error) return sendError(res, 500, 'Failed to update role', error.message)
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Admin: list all events
app.get('/api/admin/events', rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = (await (supabase as any)
      .from('events')
      .select('id,title,created_at,date,start_time,end_time,admin_tag,certificate_text')
      .order('created_at', { ascending: false })) as any

    if (error) {
      console.error('Failed to load admin events:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load events', error.message)
    }

    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Admin: get single event
app.get('/api/admin/events/:eventId', rateLimit({ windowMs: 60_000, max: 90, keyPrefix: 'admin' }), requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

  const eventId = String(req.params.eventId)

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = (await (supabase as any)
      .from('events')
      .select('id,title,created_at,date,start_time,end_time,admin_tag,certificate_text')
      .eq('id', eventId)
      .maybeSingle()) as any

    if (error) {
      console.error('Failed to load admin event:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load event', error.message)
    }
    if (!data) return res.status(404).json({ ok: false, error: 'Event not found' })
    return res.json({ ok: true, data })
  } catch (e: any) {
    console.error('Admin event route crashed:', e)
    return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
  }
})

// Admin: update event admin settings (tag + certificate)
app.post(
  '/api/admin/events/:eventId/settings',
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'admin' }),
  requireAuth,
  async (req, res) => {
    const role = await getRoleForRequest(req)
    if (!role || role !== 'admin') return res.status(403).json({ ok: false, error: 'Forbidden' })

    const eventId = String(req.params.eventId)
    const { admin_tag, certificate_text } = req.body ?? {}

    const patch: any = {}
    if (admin_tag !== undefined) patch.admin_tag = admin_tag
    if (certificate_text !== undefined) patch.certificate_text = certificate_text

    try {
      const supabase = getSupabaseAdmin()
      const { data, error } = (await (supabase as any)
        .from('events')
        .update(patch)
        .eq('id', eventId)
        .select('id,title,created_at,date,start_time,end_time,admin_tag,certificate_text')
        .maybeSingle()) as any

      if (error) {
        console.error('Failed to update event settings:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        })
        return sendError(res, 500, 'Failed to update event settings', error.message)
      }
      if (!data) return res.status(404).json({ ok: false, error: 'Event not found' })
      return res.json({ ok: true, data })
    } catch (e: any) {
      console.error('Admin update event settings route crashed:', e)
      return sendError(res, 500, 'Unexpected server error', e?.message ?? String(e))
    }
  }
)

// Current user basic profile
app.get('/api/me', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  try {
    const supabase = getSupabase()
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })

    const supabaseUser = getSupabaseForUser(token)

    const { data: profile, error: profileErr } = (await supabaseUser
      .from('users')
      .select('full_name,email,role')
      .eq('id', userData.user.id)
      .maybeSingle()) as any

    if (profileErr) return res.status(500).json({ ok: false, error: 'Failed to load profile' })

    const meta: any = (userData.user as any).user_metadata ?? {}

    try {
      const fullName = (profile?.full_name ?? meta.full_name ?? null) as string | null
      await (supabaseUser as any).from('users').upsert({
        id: userData.user.id,
        email: userData.user.email,
        full_name: fullName,
        role: profile?.role ?? 'volunteer'
      })
    } catch {

    }

    return res.json({
      ok: true,
      data: {
        id: userData.user.id,
        email: userData.user.email,
        role: profile?.role ?? 'volunteer',
        full_name: profile?.full_name ?? meta.full_name ?? null,
        gender: meta.gender ?? null,
        university_id: meta.university_id ?? null,
        national_id: meta.national_id ?? null,
        birth_date: meta.birth_date ?? null,
        phone: meta.phone ?? null,
        college: meta.college ?? null,
        department: meta.department ?? null,
        academic_level: meta.academic_level ?? null,
        skills: meta.skills ?? null
      }
    })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Organizer/Admin: list events created by the current user
app.get('/api/organizer/events', requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || (role !== 'organizer' && role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Forbidden' })
  }

  const token = pickBearerToken(req)
  if (!token) return res.status(401).json({ ok: false, error: 'Missing token' })

  try {
    const supabase = getSupabase()
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })

    const supabaseUser = getSupabaseForUser(token)

    const { data, error } = (await supabaseUser
      .from('events')
      .select('*')
      .eq('created_by', userData.user.id)
      .order('created_at', { ascending: false })) as any

    if (error) {
      console.error('Failed to load organizer events:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load events', error.message)
    }
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Create event (organizer/admin)
app.post('/api/events', requireAuth, async (req, res) => {
  const role = await getRoleForRequest(req)
  if (!role || (role !== 'organizer' && role !== 'admin')) {
    return res.status(403).json({ ok: false, error: 'Forbidden' })
  }

  const token = pickBearerToken(req)!
  const supabase = getSupabase()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })
  const userId = userData.user.id
  const supabaseUser = getSupabaseForUser(token)

  const { title, description, capacity, start_time, end_time, type, date } = req.body ?? {}
  if (!title) return res.status(400).json({ ok: false, error: 'Missing title' })

  if (start_time != null) {
    const t = new Date(start_time)
    if (Number.isNaN(t.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid start_time' })
    }
  }

  if (end_time != null) {
    const t = new Date(end_time)
    if (Number.isNaN(t.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid end_time' })
    }
  }

  if (date != null) {
    const t = new Date(date)
    if (Number.isNaN(t.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid date' })
    }
  }

  const derivedDate = (() => {
    if (date != null) return new Date(date)
    if (start_time != null) return new Date(start_time)
    return new Date()
  })()
  const derivedDateOnly = derivedDate.toISOString().slice(0, 10)

  try {
    const { data, error } = await supabaseUser
      .from('events')
      .insert({
        type: type ?? 'general',
        date: derivedDateOnly,
        title,
        description: description ?? null,
        capacity: Number.isFinite(capacity) ? capacity : 0,
        start_time: start_time ?? null,
        end_time: end_time ?? null,
        created_by: userId,
        qr_token: randomToken()
      } as any)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to create event:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to create event', error.message)
    }
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Volunteer registers to event -> generates QR payload stored in registrations
app.post('/api/events/:eventId/register', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)!
  const supabase = getSupabase()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })
  const userId = userData.user.id

  const supabaseUser = getSupabaseForUser(token)

  const eventId = req.params.eventId
  try {
    const { data: event, error: eventErr } = (await supabaseUser
      .from('events')
      .select('id,capacity')
      .eq('id', eventId)
      .single()) as any
    if (eventErr || !event) return res.status(404).json({ ok: false, error: 'Event not found' })

    const { data: existing, error: existingErr } = (await supabaseUser
      .from('registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()) as any

    if (existingErr) {
      console.error('Failed to check existing registration:', {
        code: (existingErr as any).code,
        message: existingErr.message,
        details: (existingErr as any).details,
        hint: (existingErr as any).hint
      })
      return sendError(res, 500, 'Failed to register', existingErr.message)
    }

    if (existing) {
      return res.json({ ok: true, data: existing, already_registered: true })
    }

    const { count, error: countErr } = await supabaseUser
      .from('registrations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)

    if (countErr) {
      console.error('Failed to count registrations:', {
        code: (countErr as any).code,
        message: countErr.message,
        details: (countErr as any).details,
        hint: (countErr as any).hint
      })
      return sendError(res, 500, 'Failed to register', countErr.message)
    }

    const capacity = Number(event.capacity ?? 0)
    if (typeof count === 'number' && capacity > 0 && count >= capacity) {
      return res.status(409).json({ ok: false, error: 'Event is full' })
    }

    const regToken = randomToken()
    const registrationId = randomToken()
    const payload = {
      user_id: userId,
      event_id: eventId,
      registration_id: registrationId,
      token: regToken
    }

    const { data, error } = await supabaseUser
      .from('registrations')
      .upsert({
        user_id: userId,
        event_id: eventId,
        token: regToken,
        qr_payload: payload
      } as any)
      .select('*')
      .single()

    if (error) {
      console.error('Failed to upsert registration:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to register', error.message)
    }
    return res.json({ ok: true, data })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Volunteer fetches their QR payload for an event
app.get('/api/events/:eventId/my-qr', requireAuth, async (req, res) => {
  const token = pickBearerToken(req)!
  const supabase = getSupabase()
  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })
  const userId = userData.user.id
  const eventId = req.params.eventId

  try {
    const supabaseUser = getSupabaseForUser(token)
    const { data, error } = (await supabaseUser
      .from('registrations')
      .select('qr_payload')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()) as any

    if (error) {
      console.error('Failed to load my QR:', {
        code: (error as any).code,
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint
      })
      return sendError(res, 500, 'Failed to load QR', error.message)
    }

    if (!data?.qr_payload) return res.status(404).json({ ok: false, error: 'Not registered' })
    return res.json({ ok: true, data: { payload: data.qr_payload } })
  } catch {
    return res.status(500).json({ ok: false, error: 'Unexpected server error' })
  }
})

// Organizer attendance scan: event attendance link token + scanned volunteer payload
app.post(
  '/api/events/:eventId/attendance/scan',
  rateLimit({ windowMs: 60_000, max: 120, keyPrefix: 'attendance-scan' }),
  requireAuth,
  async (req, res) => {
    const role = await getRoleForRequest(req)
    if (!role || (role !== 'organizer' && role !== 'admin')) {
      return res.status(403).json({ ok: false, error: 'Forbidden' })
    }

    const eventId = req.params.eventId
    const attendanceToken = String(req.query.token ?? '')
    const scanned = req.body?.qrPayload

    if (!attendanceToken) return res.status(400).json({ ok: false, error: 'Missing attendance token' })
    if (!scanned || typeof scanned !== 'object') return res.status(400).json({ ok: false, error: 'Missing qrPayload' })

    const token = pickBearerToken(req)!
    const supabase = getSupabase()
    const { data: scannerData, error: scannerErr } = await supabase.auth.getUser(token)
    if (scannerErr || !scannerData.user) return res.status(401).json({ ok: false, error: 'Invalid token' })
    const scannedBy = scannerData.user.id

    const supabaseUser = getSupabaseForUser(token)

    try {
      const { data: event, error: eventErr } = (await supabaseUser
        .from('events')
        .select('id,qr_token')
        .eq('id', eventId)
        .single()) as any

      if (eventErr) {
        console.error('Failed to load event for attendance scan:', {
          code: (eventErr as any).code,
          message: eventErr.message,
          details: (eventErr as any).details,
          hint: (eventErr as any).hint
        })
        return sendError(res, 500, 'Failed to load event', eventErr.message)
      }

      if (!event) return res.status(404).json({ ok: false, error: 'Event not found' })
      if (event.qr_token !== attendanceToken) return res.status(403).json({ ok: false, error: 'Invalid attendance token' })

      const qrUserId = scanned.user_id
      const qrEventId = scanned.event_id
      const qrToken = scanned.token

      if (!qrUserId || !qrEventId || !qrToken) {
        return res.status(400).json({ ok: false, error: 'Invalid QR payload' })
      }
      if (qrEventId !== eventId) {
        return res.status(400).json({ ok: false, error: 'QR does not belong to this event' })
      }

      const { data: reg, error: regErr } = (await supabaseUser
        .from('registrations')
        .select('user_id,event_id,token')
        .eq('user_id', qrUserId)
        .eq('event_id', eventId)
        .single()) as any

      if (regErr || !reg) return res.status(404).json({ ok: false, error: 'User not registered for this event' })
      if (reg.token !== qrToken) return res.status(400).json({ ok: false, error: 'QR token mismatch' })

      const { data: existing } = (await supabaseUser
        .from('attendance')
        .select('*')
        .eq('user_id', qrUserId)
        .eq('event_id', eventId)
        .maybeSingle()) as any

      if (!existing || !existing.check_in) {
        const { data, error } = await supabaseUser
          .from('attendance')
          .upsert({
            user_id: qrUserId,
            event_id: eventId,
            scanned_by: scannedBy,
            check_in: new Date().toISOString(),
            check_out: null
          } as any)
          .select('*')
          .single()

        if (error) {
          console.error('Failed to check-in:', {
            code: (error as any).code,
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint
          })
          return sendError(res, 500, 'Failed to check-in', error.message)
        }
        return res.json({ ok: true, action: 'check_in', data })
      }

      const checkInMs = new Date(existing.check_in).getTime()
      if (Number.isNaN(checkInMs)) {
        return res.status(500).json({ ok: false, error: 'Invalid existing check-in timestamp' })
      }
      const nowMs = Date.now()
      const minCheckoutMs = 10 * 60 * 1000
      if (nowMs - checkInMs < minCheckoutMs) {
        return res.status(400).json({
          ok: false,
          error: 'لا يمكن تسجيل الانصراف قبل مرور 10 دقائق من تسجيل الدخول'
        })
      }

      const { data, error } = await supabaseUser
        .from('attendance')
        .upsert({
          user_id: qrUserId,
          event_id: eventId,
          scanned_by: scannedBy,
          check_in: existing.check_in,
          check_out: new Date().toISOString()
        } as any)
        .select('*')
        .single()

      if (error) {
        console.error('Failed to check-out:', {
          code: (error as any).code,
          message: error.message,
          details: (error as any).details,
          hint: (error as any).hint
        })
        return sendError(res, 500, 'Failed to check-out', error.message)
      }
      return res.json({ ok: true, action: 'check_out', data })
    } catch {
      return res.status(500).json({ ok: false, error: 'Unexpected server error' })
    }
  }
)

const requestedPort = Number(process.env.PORT || 4000)
const server = app.listen(requestedPort, () => {
  console.log(`[server] listening on http://localhost:${requestedPort}`)
})

server.on('error', (err: any) => {
  if (err?.code !== 'EADDRINUSE') {
    throw err
  }

  const fallbackPort = requestedPort + 1
  console.warn(`[server] port ${requestedPort} in use, retrying on ${fallbackPort}`)
  app
    .listen(fallbackPort, () => {
      console.log(`[server] listening on http://localhost:${fallbackPort}`)
    })
    .on('error', (err2: any) => {
      throw err2
    })
})
