'use client'

import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'

type EventRow = {
  id: string
  title: string
  description: string | null
  capacity: number | null
  start_time: string | null
  end_time: string | null
  created_at: string
}

type RegRow = { event_id: string; created_at: string }

type Availability = {
  event_id: string
  capacity: number
  registeredCount: number
  isFull: boolean
  remaining: number | null
}

export default function EventDetailsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const qc = useQueryClient()
  
  const regMutationKey = ['register', eventId]

  const ev = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: EventRow[] }>('/api/events')
      const list = res.data.data
      const found = list.find((x) => String(x.id) === String(eventId))
      if (!found) throw new Error('Not found')
      return found as EventRow
    },
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const regs = useQuery({
    queryKey: ['my-registrations'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: RegRow[] }>('/api/me/registrations')
      return res.data.data
    },
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const availability = useQuery({
    queryKey: ['event-availability', eventId],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: Availability }>(`/api/events/${eventId}/availability`)
      return res.data.data
    },
    enabled: !!eventId,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const registered = (regs.data ?? []).some((r) => String(r.event_id) === String(eventId))
  const isFull = !!availability.data?.isFull

  const register = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ ok: boolean; data?: any; error?: string; details?: string }>(`/api/events/${eventId}/register`)
      return res.data
    },
    onSuccess: async () => {
      qc.setQueryData<RegRow[]>(['my-registrations'], (prev) => {
        const list = prev ?? []
        if (list.some((r) => String(r.event_id) === String(eventId))) return list
        return [{ event_id: String(eventId), created_at: new Date().toISOString() }, ...list]
      })
      await qc.invalidateQueries({ queryKey: ['my-registrations'] })
      await qc.invalidateQueries({ queryKey: ['events'] })
    }
  })

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="تفاصيل الفعالية">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/events" className="text-sm text-zinc-600 hover:text-black">
            ← رجوع
          </Link>
          {registered && (
            <Link
              href={`/events/${eventId}/qr`}
              className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
            >
              عرض QR
            </Link>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            {ev.isLoading && (
              <div>
                <div className="h-8 w-2/3 rounded bg-zinc-100" />
                <div className="mt-4 h-4 w-full rounded bg-zinc-100" />
                <div className="mt-2 h-4 w-5/6 rounded bg-zinc-100" />
              </div>
            )}

            {ev.isError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">تعذر تحميل الفعالية.</div>
            )}

            {ev.data && (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-3xl font-black tracking-tight">{ev.data.title}</div>
                  <div className="mt-2 text-sm text-zinc-600">{ev.data.description ?? 'بدون وصف'}</div>
                </div>
                {registered ? (
                  <div className="inline-flex rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">مسجل</div>
                ) : (
                  <div className="inline-flex rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">غير مسجل</div>
                )}
              </div>
            )}
          </div>

          <div className="p-6">
            {ev.data && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">السعة</div>
                    <div className="mt-1 text-lg font-extrabold">{ev.data.capacity ?? 0}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">البداية</div>
                    <div className="mt-1 font-mono text-xs text-zinc-700">{ev.data.start_time ?? '—'}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">النهاية</div>
                    <div className="mt-1 font-mono text-xs text-zinc-700">{ev.data.end_time ?? '—'}</div>
                  </div>
                </div>

                {availability.data && (
                  <div className="mt-4 rounded-2xl border border-black/10 bg-zinc-50 p-4">
                    <div className="text-xs text-zinc-500">المسجلين</div>
                    <div className="mt-1 text-lg font-extrabold">
                      {availability.data.registeredCount}
                      <span className="text-sm font-semibold text-zinc-500"> / {availability.data.capacity}</span>
                    </div>
                    {isFull && !registered && (
                      <div className="mt-2 inline-flex rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-900">
                        العدد مكتمل
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6">
                  <div className="text-sm font-extrabold">التسجيل</div>
                  <div className="mt-2 text-sm text-zinc-600">بعد التسجيل ستحصل على QR خاص بك. التحضير يتم فقط عبر المنظم.</div>

                  {register.isError && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {(() => {
                        const anyErr: any = register.error
                        const msg = anyErr?.response?.data?.error ?? anyErr?.message
                        const details = anyErr?.response?.data?.details
                        return details ? `${msg}: ${details}` : msg ?? 'تعذر إكمال التسجيل'
                      })()}
                    </div>
                  )}

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-50"
                      disabled={registered || isFull || register.isPending}
                      onClick={() => register.mutate()}
                    >
                      {registered ? 'تم التسجيل' : isFull ? 'العدد مكتمل' : register.isPending ? 'جاري التسجيل…' : 'سجل الآن'}
                    </button>
                    {registered && (
                      <Link
                        href={`/events/${eventId}/qr`}
                        className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
                      >
                        عرض QR
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
