'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabaseClient'
import { LucideQrCode, LucideShieldCheck, LucideClock, LucideCalendar, LucideAlertCircle, LucideDownload, LucideRefreshCw } from 'lucide-react'

export default function EventQrPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const q = useQuery({
    queryKey: ['my-qr', eventId],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { data, error } = await supabase
        .from('registrations')
        .select('token, user_id, event_id, created_at')
        .eq('user_id', session.user.id)
        .eq('event_id', eventId)
        .single()

      if (error) throw error
      return { payload: data }
    }
  })

  const payloadString = q.data ? JSON.stringify(q.data.payload) : ''

  const downloadQR = () => {
    const svg = document.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()

    img.onload = () => {
      canvas.width = 512
      canvas.height = 512
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 512, 512)

      const pngUrl = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.href = pngUrl
      downloadLink.download = `qr-${eventId}.png`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="رمز الحضور">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/events/${eventId}`} className="group flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-black transition-colors">
            <span className="group-hover:-translate-x-1 transition-transform">→</span>
            رجوع للفعالية
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {/* Info Card */}
          <div className="rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#C9A84C]/10 to-transparent p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                <LucideShieldCheck size={24} className="text-[#C9A84C]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-[#0D0C0A]">رمز الحضور الآمن</h3>
                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                  هذا الرمز فريد خاص بك لهذه الفعالية. اعرضه للمنظم عند الوصول للحصول على تأكيد الحضور.
                  لا يمكن استخدام هذا الرمز لأي فعالية أخرى.
                </p>
              </div>
            </div>
          </div>

          {/* QR Card */}
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-2xl shadow-black/10">
            <div className="border-b border-black/5 bg-gradient-to-r from-zinc-50 to-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-[#0D0C0A]">رمز الاستجابة السريعة</h2>
                  <p className="mt-1 text-sm text-zinc-500">QR Code</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center">
                  <LucideQrCode size={24} className="text-[#C9A84C]" />
                </div>
              </div>
            </div>

            <div className="p-8">
              {q.isLoading && (
                <div className="rounded-3xl border border-black/10 bg-zinc-50 p-12 text-center">
                  <div className="h-64 w-64 rounded-3xl bg-zinc-200 mx-auto animate-pulse" />
                  <div className="mt-6 h-4 w-64 rounded bg-zinc-200 mx-auto animate-pulse" />
                </div>
              )}

              {q.isError && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <LucideAlertCircle size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-black text-red-900 mb-2">تعذر تحميل الرمز</h3>
                  <p className="text-sm text-red-700">تأكد أنك مسجل في هذه الفعالية</p>
                </div>
              )}

              {q.data && (
                <div className="space-y-6">
                  <div className="rounded-3xl border-2 border-black/5 bg-gradient-to-br from-white to-zinc-50 p-8 text-center shadow-inner">
                    <div className="mx-auto inline-flex rounded-3xl border-2 border-black/10 bg-white p-6 shadow-lg">
                      <QRCodeSVG value={payloadString} height={280} width={280} level="H" includeMargin={true} />
                    </div>
                  </div>

                  {/* Registration Info */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/5 bg-zinc-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                          <LucideCalendar size={18} className="text-[#C9A84C]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase">تاريخ التسجيل</div>
                          <div className="text-sm font-black text-zinc-700">
                            {q.data.payload.created_at ? new Date(q.data.payload.created_at).toLocaleDateString('ar-SA') : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-zinc-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center">
                          <LucideClock size={18} className="text-[#C9A84C]" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-zinc-400 uppercase">وقت التسجيل</div>
                          <div className="text-sm font-black text-zinc-700">
                            {q.data.payload.created_at ? new Date(q.data.payload.created_at).toLocaleTimeString('ar-SA') : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={downloadQR}
                      className="flex-1 h-12 rounded-2xl bg-[#C9A84C] text-[#0D0C0A] font-black text-sm flex items-center justify-center gap-2 hover:bg-[#E8C97A] transition-all shadow-lg shadow-[#C9A84C]/20 active:scale-95"
                    >
                      <LucideDownload size={18} />
                      تحميل الرمز
                    </button>
                    <button
                      onClick={() => q.refetch()}
                      className="h-12 px-6 rounded-2xl border-2 border-black/10 bg-white text-zinc-700 font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all active:scale-95"
                    >
                      <LucideRefreshCw size={18} />
                      تحديث
                    </button>
                  </div>

                  {/* Help Text */}
                  <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-4">
                    <p className="text-xs text-zinc-600 leading-relaxed text-center">
                      <span className="font-bold text-[#C9A84C]">نصيحة:</span> احفظ صورة الرمز كاحتياطي في حال واجهت مشكلة في الاتصال.
                      يمكنك طلب إعادة المسح من المنظم إذا لزم الأمر.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
