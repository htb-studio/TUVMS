'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'

type EventRow = {
  id: string
  title: string
  description: string | null
  capacity: number | null
  start_time: string | null
  end_time: string | null
  created_at: string
  qr_token: string
}

export default function OrganizerPage() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState<number>(0)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [createError, setCreateError] = useState<string>('')

  const events = useQuery({
    queryKey: ['org-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as EventRow[]
    },
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const createEvent = useMutation({
    mutationFn: async () => {
      const startIso = startTime ? new Date(startTime).toISOString() : null
      const endIso = endTime ? new Date(endTime).toISOString() : null
      const dateOnly = startTime ? new Date(startTime).toISOString().slice(0, 10) : null
      
      if (startTime && Number.isNaN(new Date(startTime).getTime())) {
        throw new Error('وقت البداية غير صحيح')
      }
      if (endTime && Number.isNaN(new Date(endTime).getTime())) {
        throw new Error('وقت النهاية غير صحيح')
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          title,
          description: description || null,
          capacity,
          start_time: startIso,
          end_time: endIso,
          date: dateOnly,
          qr_token: Math.random().toString(36).substring(2, 15),
          is_visible: true,
          is_closed: false
        })
        .select()
        .single()

      if (error) throw error
      return data as EventRow
    },
    onSuccess: async (created) => {
      setCreateError('')
      setTitle('')
      setDescription('')
      setCapacity(0)
      setStartTime('')
      setEndTime('')

      qc.setQueryData<EventRow[]>(['org-events'], (prev) => {
        if (!prev) return [created]
        if (prev.some((x) => String(x.id) === String(created.id))) return prev
        return [created, ...prev]
      })
      await qc.invalidateQueries({ queryKey: ['org-events'] })
      await qc.invalidateQueries({ queryKey: ['events-v2'] })
    },
    onError: (err: any) => {
      setCreateError(err.message || 'تعذر إنشاء الفعالية')
    }
  })

  const prepLink = useMemo(() => {
    if (!events.data?.[0]) return ''
    return `${window.location.origin}/event/${events.data[0].id}/attendance?token=${encodeURIComponent(events.data[0].qr_token)}`
  }, [events.data])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['organizer', 'admin']}>
        <AppShell title="لوحة المنظم">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <div className="text-lg font-black">إنشاء فعالية جديدة</div>
                <div className="mt-2 text-sm text-zinc-600">اصنع مبادرة فاخرة التنظيم… ثم شارك رابط التحضير مع فريقك.</div>
              </div>
              <div className="p-6">
                {createError && (
                  <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                    {createError}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-600 mb-2">العنوان</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: حملة التبرع بالدم"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-600 mb-2">الوصف</label>
                    <textarea
                      className="min-h-[96px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none focus:border-black/30"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="وصف مختصر للفعالية…"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-2">السعة</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value || 0))}
                      type="number"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-2">البداية</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      type="datetime-local"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-600 mb-2">النهاية</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none focus:border-black/30"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      type="datetime-local"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      className="h-12 w-full rounded-2xl bg-black px-6 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                      disabled={createEvent.isPending || !title.trim()}
                      onClick={() => createEvent.mutate()}
                    >
                      {createEvent.isPending ? 'جاري الإنشاء…' : '+ إنشاء الفعالية'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <div className="text-lg font-black">فعالياتك</div>
                <div className="mt-2 text-sm text-zinc-600">إدارة سريعة + تقارير حضور.</div>
              </div>
              <div className="p-6">
                {events.isLoading && (
                  <div className="grid gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="rounded-3xl border border-black/10 bg-zinc-50 p-5">
                        <div className="h-4 w-2/3 rounded bg-zinc-200" />
                        <div className="mt-3 h-4 w-full rounded bg-zinc-200" />
                        <div className="mt-2 h-4 w-4/6 rounded bg-zinc-200" />
                        <div className="mt-4 h-10 w-32 rounded-2xl bg-zinc-200" />
                      </div>
                    ))}
                  </div>
                )}

                {events.isError && (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل فعالياتك.</div>
                )}

                {events.data && events.data.length === 0 && (
                  <div className="rounded-3xl border border-black/10 bg-white p-10 text-center">
                    <div className="text-lg font-extrabold">لا توجد فعاليات بعد</div>
                    <div className="mt-2 text-sm text-zinc-600">ابدأ بإنشاء أول فعالية من النموذج.</div>
                  </div>
                )}

                {events.data && events.data.length > 0 && (
                  <div className="grid gap-3">
                    {events.data.map((e) => (
                      <div key={e.id} className="rounded-3xl border border-black/10 bg-white p-5">
                        <div className="text-sm font-extrabold">{e.title}</div>
                        <div className="mt-2 text-sm text-zinc-600 line-clamp-2">{e.description ?? 'بدون وصف'}</div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/organizer/events/${e.id}`}
                            className="h-10 rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
                          >
                            التفاصيل
                          </Link>
                          <Link
                            href={`/organizer/events/${e.id}/attendance`}
                            className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
                          >
                            تقرير الحضور
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {prepLink && (
                  <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                    تنبيه: رابط التحضير مخصص لفريق التنظيم.
                  </div>
                )}
              </div>
            </div>
          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
