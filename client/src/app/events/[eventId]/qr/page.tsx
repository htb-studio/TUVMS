'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'

type QRRes = { ok: boolean; data: { payload: any } }

export default function EventQrPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const q = useQuery({
    queryKey: ['my-qr', eventId],
    queryFn: async () => {
      const res = await api.get<QRRes>(`/api/events/${eventId}/my-qr`)
      return res.data.data
    }
  })

  const payloadString = q.data ? JSON.stringify(q.data.payload) : ''

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="QR الخاص بك">
        <div className="flex items-center justify-between gap-4">
          <Link href={`/events/${eventId}`} className="text-sm text-zinc-600 hover:text-black">
            ← رجوع
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <div className="text-lg font-black">رمز الحضور (QR)</div>
            <div className="mt-2 text-sm text-zinc-600">اعرض هذا الرمز للمنظم عند بدء التحضير. لا يوجد تحضير ذاتي.</div>
          </div>
          <div className="p-6">
            {q.isLoading && (
              <div className="rounded-3xl border border-black/10 bg-zinc-50 p-10 text-center">
                <div className="h-52 w-52 rounded-3xl bg-zinc-200 mx-auto" />
                <div className="mt-6 h-4 w-56 rounded bg-zinc-200 mx-auto" />
              </div>
            )}

            {q.isError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل QR. تأكد أنك مسجل في الفعالية.</div>
            )}

            {q.data && (
              <div className="rounded-3xl border border-black/10 bg-white p-8 text-center">
                <div className="mx-auto inline-flex rounded-3xl border border-black/10 bg-white p-4">
                  <QRCodeSVG value={payloadString} height={240} width={240} level="M" />
                </div>
                <div className="mt-6 text-sm text-zinc-600">إن واجهت مشكلة، اطلب من المنظم إعادة المسح أو تحديث الصفحة.</div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
