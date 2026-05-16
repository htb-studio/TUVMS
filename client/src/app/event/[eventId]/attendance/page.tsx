'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { BrowserMultiFormatReader } from '@zxing/browser'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import AppShell from '@/components/AppShell'
import { api } from '@/lib/api'
import Link from 'next/link'

type ScanResult =
  | { ok: true; action: 'check_in' | 'check_out'; at: string; userId: string }
  | { ok: false; error: string; at: string }

export default function EventAttendancePrepPage() {
  const params = useParams<{ eventId: string }>()
  const search = useSearchParams()
  const eventId = params.eventId
  const token = search.get('token') ?? ''

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<'idle' | 'starting' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [last, setLast] = useState<ScanResult | null>(null)
  const [log, setLog] = useState<ScanResult[]>([])
  const [cooldown, setCooldown] = useState(false)
  const [manualPayload, setManualPayload] = useState('')
  const lastScanRef = useRef<{ raw: string; atMs: number } | null>(null)

  const canStart = useMemo(() => !!eventId && !!token, [eventId, token])

  useEffect(() => {
    return () => {
      try {
        ;(readerRef.current as any)?.reset?.()
      } catch {
        
      }
    }
  }, [])

  async function handleRaw(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed) return

    const now = Date.now()
    const lastScan = lastScanRef.current
    if (lastScan && lastScan.raw === trimmed && now - lastScan.atMs < 1500) {
      return
    }
    lastScanRef.current = { raw: trimmed, atMs: now }

    const at = new Date().toISOString()

    let parsed: any = null
    try {
      parsed = JSON.parse(trimmed)
    } catch {
      parsed = null
    }

    if (!parsed || typeof parsed !== 'object') {
      const r: ScanResult = { ok: false, error: 'QR غير صالح (يجب أن يكون JSON).', at }
      setLast(r)
      setLog((x) => [r, ...x].slice(0, 20))
      return
    }

    try {
      const res = await api.post<{ ok: boolean; action?: 'check_in' | 'check_out'; error?: string }>(
        `/api/events/${eventId}/attendance/scan?token=${encodeURIComponent(token)}`,
        { qrPayload: parsed }
      )

      if (!res.data.ok || !res.data.action) {
        const r: ScanResult = { ok: false, error: res.data.error ?? 'فشل التحقق من الحضور.', at }
        setLast(r)
        setLog((x) => [r, ...x].slice(0, 20))
        return
      }

      const r: ScanResult = {
        ok: true,
        action: res.data.action,
        at,
        userId: String(parsed.user_id ?? '')
      }
      setLast(r)
      setLog((x) => [r, ...x].slice(0, 20))
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'حدث خطأ غير متوقع'
      const r: ScanResult = { ok: false, error: String(msg), at }
      setLast(r)
      setLog((x) => [r, ...x].slice(0, 20))
    }
  }

  async function start() {
    if (!canStart) {
      setStatus('error')
      setError('رابط التحضير غير مكتمل. تأكد من وجود token في الرابط.')
      return
    }

    if (typeof window !== 'undefined') {
      const hasMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
      if (!hasMedia) {
        setStatus('idle')
        setError('المتصفح لا يدعم الكاميرا. استخدم الإدخال اليدوي أو جرّب متصفحًا أحدث.')
        return
      }
      if (!window.isSecureContext) {
        setStatus('idle')
        setError('تشغيل الكاميرا يتطلب HTTPS. افتح الموقع عبر https://athar.it.com ثم أعد المحاولة.')
        return
      }
    }

    setError(null)
    setStatus('starting')

    try {
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      const video = videoRef.current
      if (!video) throw new Error('Missing video element')

      setRunning(true)
      // Try to get back camera with autofocus
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }

      await reader.decodeFromConstraints(constraints, video, async (result, _err, controls) => {
        if (!result) return
        if (cooldown) return

        setCooldown(true)
        setTimeout(() => setCooldown(false), 1000)

        const raw = result.getText()
        await handleRaw(raw)
        
        // Simple vibration for feedback
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50)
        }

        if (!controls) return
      })

      setStatus('ready')
    } catch (e: any) {
      setRunning(false)
      setStatus('idle')
      const name = String(e?.name ?? '')
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('تم رفض إذن الكاميرا. يمكنك السماح من إعدادات المتصفح أو استخدم الإدخال اليدوي.')
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setError('لا توجد كاميرا متاحة على هذا الجهاز. استخدم الإدخال اليدوي.')
      } else {
        setError(e?.message ?? 'تعذر تشغيل الكاميرا')
      }
    }
  }

  function stop() {
    try {
      ;(readerRef.current as any)?.reset?.()
    } catch {
      
    }
    setRunning(false)
    setStatus('idle')
  }

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['organizer', 'admin']}>
        <AppShell title="تحضير الحضور">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href={`/organizer/events/${eventId}`} className="text-sm text-zinc-600 hover:text-black">
              ← رجوع
            </Link>

            <div className="flex flex-wrap gap-2">
              {!running ? (
                <button
                  className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                  disabled={!canStart}
                  onClick={start}
                  type="button"
                >
                  بدء المسح
                </button>
              ) : (
                <button
                  className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                  onClick={stop}
                  type="button"
                >
                  إيقاف
                </button>
              )}

              <Link
                href={`/organizer/events/${eventId}/attendance`}
                className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
              >
                تقرير الحضور
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <div className="text-lg font-black">الماسح</div>
                <div className="mt-2 text-sm text-zinc-600">وجّه الكاميرا على QR الخاص بالمتطوع.</div>
              </div>
              <div className="p-6">
                <div className="overflow-hidden rounded-3xl border border-black/10 bg-zinc-50">
                  <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
                </div>

                <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4">
                  <div className="text-sm font-extrabold">إدخال يدوي</div>
                  <div className="mt-2 text-sm text-zinc-600">الصق محتوى QR (JSON) أو استخدم ماسح ضوئي.</div>
                  <textarea
                    className="mt-3 min-h-[110px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
                    value={manualPayload}
                    onChange={(e) => setManualPayload(e.target.value)}
                    placeholder='{"user_id":"...","event_id":"...","token":"..."}'
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="h-10 rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                      onClick={async () => {
                        if (cooldown) return
                        setCooldown(true)
                        setTimeout(() => setCooldown(false), 1500)
                        await handleRaw(manualPayload)
                      }}
                      disabled={!manualPayload.trim() || !canStart || cooldown}
                      type="button"
                    >
                      تحقق
                    </button>
                    <button
                      className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-60"
                      onClick={() => setManualPayload('')}
                      disabled={!manualPayload.trim()}
                      type="button"
                    >
                      مسح
                    </button>
                  </div>
                </div>

                {status === 'starting' && (
                  <div className="mt-4 rounded-3xl border border-black/10 bg-white p-4 text-sm text-zinc-600">جاري تشغيل الكاميرا…</div>
                )}

                {error && (
                  <div className="mt-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
                )}

                {!token && (
                  <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    هذا الرابط يحتاج token. استخدم رابط التحضير الذي يظهر داخل تفاصيل الفعالية في لوحة المنظم.
                  </div>
                )}

                {last && (
                  <div
                    className={`mt-4 rounded-3xl border p-4 text-sm ${
                      last.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {last.ok ? (
                      <div className="font-bold">تم {last.action === 'check_in' ? 'تسجيل دخول' : 'تسجيل انصراف'} بنجاح</div>
                    ) : (
                      <div className="font-bold">فشل المسح</div>
                    )}
                    <div className="mt-2 font-mono text-xs opacity-80">{last.at}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <div className="text-lg font-black">سجل مباشر</div>
                <div className="mt-2 text-sm text-zinc-600">آخر العمليات (تحديث فوري داخل نفس الصفحة).</div>
              </div>
              <div className="p-6">
                {log.length === 0 && (
                  <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
                    <div className="text-lg font-extrabold">لا يوجد سجل بعد</div>
                    <div className="mt-2 text-sm text-zinc-600">ابدأ المسح لتظهر النتائج هنا.</div>
                  </div>
                )}

                {log.length > 0 && (
                  <div className="grid gap-2">
                    {log.map((r, idx) => (
                      <div
                        key={idx}
                        className={`rounded-3xl border p-4 ${
                          r.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className={`text-sm font-extrabold ${r.ok ? 'text-emerald-900' : 'text-red-800'}`}>
                          {r.ok ? (r.action === 'check_in' ? 'تسجيل دخول' : 'تسجيل انصراف') : 'مرفوض'}
                        </div>
                        <div className="mt-1 text-sm text-zinc-700">{r.ok ? `المتطوع: ${r.userId || '—'}` : r.error}</div>
                        <div className="mt-2 font-mono text-xs text-zinc-600">{r.at}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  يتم تسجيل أول مسح كـ دخول، والمسح التالي لنفس المتطوع كـ انصراف.
                </div>
              </div>
            </div>
          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
