'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import AppShell from '@/components/AppShell'
import { api } from '@/lib/api'
import Link from 'next/link'

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

type ReportRow = {
  id: string
  user_id: string
  event_id: string
  check_in: string | null
  check_out: string | null
  created_at: string
  user_email: string | null
  user_full_name: string | null
}

async function getOrganizerEvent(eventId: string) {
  const res = await api.get<{ ok: boolean; data: EventRow }>(`/api/organizer/events/${eventId}`)
  return res.data.data
}

async function fetchAttendanceSummary(eventId: string) {
  const res = await api.get<{ ok: boolean; data: { stats: any; rows: ReportRow[] } }>(
    `/api/organizer/events/${eventId}/attendance`
  )
  return res.data.data
}

export default function OrganizerEventDetailsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const q = useQuery({
    queryKey: ['org-event', eventId],
    queryFn: () => getOrganizerEvent(eventId),
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })
  const attendance = useQuery({
    queryKey: ['org-att-summary', eventId],
    queryFn: () => fetchAttendanceSummary(eventId),
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const prepLink = useMemo(() => {
    if (!q.data) return ''
    return `${window.location.origin}/event/${q.data.id}/attendance?token=${encodeURIComponent(q.data.qr_token)}`
  }, [q.data])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['organizer', 'admin']}>
        <AppShell title="تفاصيل الفعالية">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/organizer" className="text-sm text-zinc-600 hover:text-black">
              ← رجوع
            </Link>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/organizer/events/${eventId}/attendance`}
                className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
              >
                تقرير الحضور
              </Link>
              <Link
                href="/organizer"
                className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
              >
                لوحة المنظم
              </Link>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              {q.isLoading && (
                <div>
                  <div className="h-8 w-2/3 rounded bg-zinc-100" />
                  <div className="mt-4 h-4 w-full rounded bg-zinc-100" />
                  <div className="mt-2 h-4 w-5/6 rounded bg-zinc-100" />
                </div>
              )}

              {q.isError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  تعذر تحميل الفعالية. تأكد أنك المنظم أو Admin.
                </div>
              )}

              {q.data && (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-3xl font-black tracking-tight">{q.data.title}</div>
                    <div className="mt-2 text-sm text-zinc-600">{q.data.description ?? 'بدون وصف'}</div>
                  </div>
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-zinc-700">
                    ملكية: منظم الفعالية
                  </div>
                </div>
              )}
            </div>

            <div className="p-6">
              {q.data && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">السعة</div>
                      <div className="mt-1 text-lg font-extrabold">{q.data.capacity ?? 0}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">البداية</div>
                      <div className="mt-1 font-mono text-xs text-zinc-700">{q.data.start_time ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">النهاية</div>
                      <div className="mt-1 font-mono text-xs text-zinc-700">{q.data.end_time ?? '—'}</div>
                    </div>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white">
                    <div className="border-b border-black/5 bg-zinc-50/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-extrabold">رابط التحضير للحضور</div>
                          <div className="mt-1 text-sm text-zinc-600">شاركه فقط مع فريق التنظيم.</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`/event/${q.data.id}/attendance?token=${encodeURIComponent(q.data.qr_token)}`}
                            className="h-10 rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
                          >
                            فتح التحضير
                          </a>
                          <button
                            className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03]"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(prepLink)
                              } catch {
                                window.prompt('انسخ الرابط:', prepLink)
                              }
                            }}
                          >
                            نسخ الرابط
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="break-all rounded-2xl border border-black/10 bg-zinc-50 p-3 font-mono text-xs">{prepLink}</div>
                    </div>
                  </div>

                  <div className="mt-10">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-extrabold">ملخص الحضور</div>
                        <div className="mt-1 text-sm text-zinc-600">آخر تسجيلات الدخول/الانصراف لهذه الفعالية.</div>
                      </div>
                      <Link
                        href={`/organizer/events/${eventId}/attendance`}
                        className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
                      >
                        التقرير الكامل
                      </Link>
                    </div>

                    {attendance.isLoading && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                            <div className="h-3 w-20 rounded bg-zinc-200" />
                            <div className="mt-3 h-7 w-16 rounded bg-zinc-200" />
                          </div>
                        ))}
                        <div className="sm:col-span-3 h-40 rounded-2xl border border-black/10 bg-zinc-50" />
                      </div>
                    )}

                    {attendance.isError && (
                      <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        تعذر تحميل الحضور.
                      </div>
                    )}

                    {attendance.data && (
                      <>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                            <div className="text-xs text-zinc-500">الإجمالي</div>
                            <div className="mt-1 text-2xl font-extrabold">{attendance.data.stats.total}</div>
                          </div>
                          <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                            <div className="text-xs text-zinc-500">دخول</div>
                            <div className="mt-1 text-2xl font-extrabold">{attendance.data.stats.checked_in}</div>
                          </div>
                          <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                            <div className="text-xs text-zinc-500">انصراف</div>
                            <div className="mt-1 text-2xl font-extrabold">{attendance.data.stats.checked_out}</div>
                          </div>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-3xl border border-black/10">
                          <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 border-b border-black/10 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">
                            <div>المتطوع</div>
                            <div>الدخول</div>
                            <div>الانصراف</div>
                          </div>

                          {attendance.data.rows.slice(0, 5).map((r) => (
                            <div
                              key={r.id}
                              className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 border-b border-black/5 bg-white px-4 py-3 text-sm"
                            >
                              <div>
                                <div className="font-semibold">{r.user_full_name ?? '—'}</div>
                                <div className="text-xs text-zinc-500">{r.user_email ?? ''}</div>
                              </div>
                              <div className="font-mono text-xs text-zinc-700">{r.check_in ?? '—'}</div>
                              <div className="font-mono text-xs text-zinc-700">{r.check_out ?? '—'}</div>
                            </div>
                          ))}

                          {attendance.data.rows.length === 0 && (
                            <div className="px-4 py-4 text-sm text-zinc-600 bg-white">لا يوجد حضور بعد.</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="text-lg font-extrabold">اختصارات</div>
              <div className="mt-2 text-sm text-zinc-600">كل ما تحتاجه لإدارة الفعالية بسرعة.</div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/organizer/events/${eventId}/attendance`}
                  className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
                >
                  تقرير الحضور
                </Link>
                <Link
                  href="/events"
                  className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03] flex items-center"
                >
                  عرض صفحة المتطوع
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="text-lg font-extrabold">ملاحظة أمنية</div>
              <div className="mt-2 text-sm text-zinc-600">رابط التحضير مخصص لفريق التنظيم فقط. يرجى عدم مشاركته خارج الفريق.</div>
            </div>
          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
