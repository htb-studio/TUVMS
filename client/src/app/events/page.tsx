'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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

export default function EventsPage() {
  const [qText, setQText] = useState('')

  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: EventRow[] }>('/api/events')
      return res.data.data
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

  useEffect(() => {
    regs.refetch()
  }, [])

  const regSet = useMemo(() => new Set((regs.data ?? []).map((r) => String(r.event_id))), [regs.data])

  const filtered = useMemo(() => {
    const list = events.data ?? []
    const t = qText.trim().toLowerCase()
    if (!t) return list
    return list.filter((e) => (e.title ?? '').toLowerCase().includes(t) || (e.description ?? '').toLowerCase().includes(t))
  }, [events.data, qText])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="الفرص التطوعية">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <div className="text-lg font-black">اكتشف فرص التطوع</div>
            <div className="mt-2 text-sm text-zinc-600">ابحث وسجّل للحصول على QR الخاص بك.</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <input
                className="h-11 flex-1 min-w-[220px] rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                placeholder="ابحث باسم الفعالية أو الوصف…"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              <button
                className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                onClick={() => setQText('')}
                type="button"
              >
                مسح
              </button>
            </div>
          </div>

          <div className="p-6">
            {events.isLoading && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-3xl border border-black/10 bg-zinc-50 p-6">
                    <div className="h-5 w-2/3 rounded bg-zinc-200" />
                    <div className="mt-3 h-4 w-full rounded bg-zinc-200" />
                    <div className="mt-2 h-4 w-5/6 rounded bg-zinc-200" />
                    <div className="mt-6 h-11 w-32 rounded-2xl bg-zinc-200" />
                  </div>
                ))}
              </div>
            )}

            {events.isError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل الفعاليات.</div>
            )}

            {events.data && filtered.length === 0 && (
              <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
                <div className="text-lg font-extrabold">لا توجد نتائج</div>
                <div className="mt-2 text-sm text-zinc-600">جرّب كلمة بحث مختلفة.</div>
              </div>
            )}

            {events.data && filtered.length > 0 && (
              <div>
                <div className="mb-4 text-sm text-zinc-600">النتائج: {filtered.length}</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {filtered.map((e) => {
                    const registered = regSet.has(String(e.id))
                    return (
                      <div key={e.id} className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.015] transition">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-base font-extrabold">{e.title}</div>
                          {registered && (
                            <div className="inline-flex rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                              مسجل
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-zinc-600 line-clamp-2">{e.description ?? 'بدون وصف'}</div>

                        <div className="mt-6 flex flex-wrap gap-2">
                          <Link
                            href={`/events/${e.id}`}
                            className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
                          >
                            التفاصيل
                          </Link>
                          {registered && (
                            <Link
                              href={`/events/${e.id}/qr`}
                              className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
                            >
                              QR
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
