'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Html5QrcodeScanner } from 'html5-qrcode'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import { LucideScanLine, LucideUser, LucideCalendar, LucidePhone, LucideUniversity, LucideCheckCircle2, LucideXCircle, LucideThumbsUp, LucideThumbsDown, LucideX, LucideCamera, LucideRefreshCw } from 'lucide-react'

type UserProfile = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  university_id: string | null
  college: string | null
  level: number
  total_points: number
  total_hours: number
}

type EventData = {
  id: string
  title: string
  date: string | null
  start_time: string | null
}

export default function ScanAttendancePage() {
  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['admin', 'organizer']}>
        <ScanAttendanceBody />
      </RoleGate>
    </AuthGate>
  )
}

function ScanAttendanceBody() {
  const router = useRouter()
  const [scanning, setScanning] = useState(true)
  const [scannedUser, setScannedUser] = useState<UserProfile | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [events, setEvents] = useState<EventData[]>([])
  const [behaviorType, setBehaviorType] = useState<'positive' | 'negative' | 'neutral'>('neutral')
  const [behaviorCategory, setBehaviorCategory] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)

  useEffect(() => {
    // Load events
    const loadEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date, start_time')
        .order('date', { ascending: true })
      if (data) setEvents(data)
    }
    loadEvents()
  }, [])

  const handleScan = async (decodedText: string) => {
    try {
      setLoading(true)
      setError(null)
      
      // Parse QR code data - it might be JSON or just the user_id
      let userId = decodedText
      try {
        const parsed = JSON.parse(decodedText)
        if (parsed.id) {
          userId = parsed.id
        }
      } catch {
        // If not JSON, use the decoded text directly as user_id
      }
      
      // Fetch user from database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError || !user) {
        setError('المتطوع غير موجود في النظام')
        return
      }
      
      setScannedUser(user)
      setScanning(false)
      
      // Stop scanner temporarily
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
    } catch (e: any) {
      setError('خطأ في قراءة الباركود: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScanError = (errorMessage: string) => {
    // Ignore scan errors during normal operation
    console.log('Scan error:', errorMessage)
  }

  const startScanner = () => {
    setScanning(true)
    setScannedUser(null)
    setError(null)
    setSuccess(null)
    setBehaviorType('neutral')
    setBehaviorCategory('')
    setAdminNotes('')
  }

  const submitBehaviorLog = async () => {
    if (!scannedUser || !selectedEvent) {
      setError('يرجى اختيار الفعالية')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('يجب تسجيل الدخول')

      const { error } = await supabase.from('volunteer_behavior_logs').insert({
        volunteer_id: scannedUser.id,
        event_id: selectedEvent.id,
        admin_id: session.user.id,
        evaluation_type: behaviorType === 'positive' ? 'Positive' : 'Negative',
        reason_tag: behaviorCategory || 'Other',
        admin_notes: adminNotes || null
      })

      if (error) throw error

      setSuccess('تم تسجيل التقييم بنجاح')
      
      // Update user points
      const pointsChange = behaviorType === 'positive' ? 5 : (behaviorType === 'negative' ? -5 : 0)
      await supabase.from('users').update({
        total_points: (scannedUser.total_points || 0) + pointsChange
      }).eq('id', scannedUser.id)

      setTimeout(() => {
        startScanner()
      }, 2000)
    } catch (e: any) {
      setError('فشل تسجيل التقييم: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const cancelAttendance = async () => {
    if (!scannedUser || !selectedEvent) {
      setError('يرجى اختيار الفعالية')
      return
    }

    if (!confirm('هل أنت متأكد من إلغاء تحضير هذا المتطوع؟ سيتم حرمانه من الساعات والامتيازات.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('registrations')
        .update({ attendance_status: 'Cancelled' })
        .eq('user_id', scannedUser.id)
        .eq('event_id', selectedEvent.id)

      if (error) throw error

      setSuccess('تم إلغاء تحضير المتطوع بنجاح')
      
      setTimeout(() => {
        startScanner()
      }, 2000)
    } catch (e: any) {
      setError('فشل إلغاء التحضير: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const initializeScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    )
    
    scanner.render(handleScan, handleScanError)
    scannerRef.current = scanner
  }

  useEffect(() => {
    if (scanning && !scannerRef.current) {
      // Request camera permission
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(() => {
          setCameraPermission(true)
          initializeScanner()
        })
        .catch(() => {
          setCameraPermission(false)
          setError('تعذر الوصول للكاميرا. يرجى السماح بالوصول للكاميرا.')
        })
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [scanning])

  return (
    <AppShell title="مسح الحضور والتقييم">
      <div className="space-y-6">
        {/* Scanner Section */}
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <h2 className="text-lg font-black flex items-center gap-2">
              <LucideScanLine className="text-[#C9A84C]" size={24} />
              مسح باركود المتطوع
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              امسح QR Code الخاص ببطاقة المتطوع لعرض بياناته وتقييم سلوكه
            </p>
          </div>

          <div className="p-6">
            {cameraPermission === false && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                <LucideCamera className="mx-auto text-red-500 mb-4" size={48} />
                <div className="text-sm font-bold text-red-700 mb-4">
                  تعذر الوصول للكاميرا
                </div>
                <button
                  onClick={() => {
                    setCameraPermission(null)
                    setScanning(true)
                  }}
                  className="h-10 px-4 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {scanning && cameraPermission !== false && (
              <div id="qr-reader" className="rounded-2xl overflow-hidden" />
            )}

            {!scanning && (
              <button
                onClick={startScanner}
                className="h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A] flex items-center justify-center gap-2"
              >
                <LucideRefreshCw size={18} />
                مسح متطوب جديد
              </button>
            )}
          </div>
        </div>

        {/* User Profile Section */}
        {scannedUser && (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              <h2 className="text-lg font-black flex items-center gap-2">
                <LucideUser className="text-[#C9A84C]" size={24} />
                بيانات المتطوع
              </h2>
            </div>

            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">الاسم</div>
                  <div className="mt-1 text-sm font-bold">{scannedUser.full_name || '—'}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">البريد</div>
                  <div className="mt-1 text-sm font-bold break-all">{scannedUser.email || '—'}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <LucideUniversity size={12} />
                    الرقم الجامعي
                  </div>
                  <div className="mt-1 text-sm font-bold">{scannedUser.university_id || '—'}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500 flex items-center gap-1">
                    <LucidePhone size={12} />
                    رقم الجوال
                  </div>
                  <div className="mt-1 text-sm font-bold">{scannedUser.phone || '—'}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">المستوى</div>
                  <div className="mt-1 text-sm font-bold">Level {scannedUser.level || 1}</div>
                </div>
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs text-zinc-500">النقاط</div>
                  <div className="mt-1 text-sm font-bold">{scannedUser.total_points || 0}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Event Selection */}
        {scannedUser && (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              <h2 className="text-lg font-black flex items-center gap-2">
                <LucideCalendar className="text-[#C9A84C]" size={24} />
                اختيار الفعالية
              </h2>
            </div>

            <div className="p-6">
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === e.target.value)
                  setSelectedEvent(event || null)
                }}
                className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#C9A84C]"
              >
                <option value="">اختر الفعالية...</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} - {ev.date ? new Date(ev.date).toLocaleDateString('ar-SA') : 'قريباً'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Behavior Evaluation */}
        {scannedUser && selectedEvent && (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              <h2 className="text-lg font-black">التقييم السلوكي</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Behavior Type */}
              <div>
                <div className="text-xs font-bold text-zinc-600 mb-3">نوع التقييم</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBehaviorType('positive')}
                    className={`h-12 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      behaviorType === 'positive'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-black/10 bg-white text-zinc-600 hover:border-emerald-300'
                    }`}
                  >
                    <LucideThumbsUp size={16} />
                    إيجابي
                  </button>
                  <button
                    onClick={() => setBehaviorType('neutral')}
                    className={`h-12 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      behaviorType === 'neutral'
                        ? 'border-zinc-500 bg-zinc-50 text-zinc-700'
                        : 'border-black/10 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                  >
                    محايد
                  </button>
                  <button
                    onClick={() => setBehaviorType('negative')}
                    className={`h-12 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      behaviorType === 'negative'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-black/10 bg-white text-zinc-600 hover:border-red-300'
                    }`}
                  >
                    <LucideThumbsDown size={16} />
                    سلبي
                  </button>
                </div>
              </div>

              {/* Behavior Category */}
              <div>
                <div className="text-xs font-bold text-zinc-600 mb-3">فئة التقييم</div>
                <select
                  value={behaviorCategory}
                  onChange={(e) => setBehaviorCategory(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-[#C9A84C]"
                >
                  <option value="">اختر الفئة...</option>
                  <option value="professional_appearance">مظهر احترافي</option>
                  <option value="elegant_style">أسلوب راقي</option>
                  <option value="late_arrival">تأخر</option>
                  <option value="public_conduct_violation">مخالفة الذوق العام</option>
                  <option value="excellent_participation">مشاركة ممتازة</option>
                  <option value="leadership">قيادة</option>
                  <option value="teamwork">عمل جماعي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>

              {/* Admin Notes */}
              <div>
                <div className="text-xs font-bold text-zinc-600 mb-3">ملاحظات الإدارة</div>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول سلوك المتطوع..."
                  className="h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={submitBehaviorLog}
                disabled={loading || behaviorType === 'neutral' && !behaviorCategory}
                className="h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'جاري التسجيل...' : 'اعتماد التقييم'}
              </button>

              {/* Cancel Attendance Button */}
              <button
                onClick={cancelAttendance}
                disabled={loading}
                className="h-12 w-full rounded-2xl border-2 border-red-500 bg-red-50 text-red-700 text-sm font-extrabold hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                إلغاء تحضير المتطوع
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <LucideXCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
            <LucideCheckCircle2 size={18} />
            {success}
          </div>
        )}
      </div>
    </AppShell>
  )
}
