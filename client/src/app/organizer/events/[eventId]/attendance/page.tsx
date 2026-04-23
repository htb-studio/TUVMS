'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { api } from '@/lib/api'
import Link from 'next/link'

type ReportRow = {
  id: string
  user_id: string
  event_id: string
  check_in: string | null
  check_out: string | null
  scanned_by: string | null
  created_at: string
  user_email: string | null
  user_full_name: string | null
}

async function fetchReport(eventId: string) {
  const res = await api.get<{ ok: boolean; data: { event: any; stats: any; rows: ReportRow[] } }>(
    `/api/organizer/events/${eventId}/attendance`
  )
  return res.data.data
}

function toCsv(rows: ReportRow[]) {
  const header = ['#', 'البريد', 'الاسم', 'الدخول', 'الانصراف', 'وقت إنشاء السجل', 'user_id']
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return `"${s.replaceAll('"', '""')}"`
  }
  const fmt = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ar-SA')
  }
  const ordered = [...rows].sort((a, b) => {
    const an = (a.user_full_name ?? '').trim()
    const bn = (b.user_full_name ?? '').trim()
    const nameCmp = an.localeCompare(bn, 'ar')
    if (nameCmp !== 0) return nameCmp
    const ae = (a.user_email ?? '').trim()
    const be = (b.user_email ?? '').trim()
    return ae.localeCompare(be)
  })

  const lines = [header.map(escape).join(',')]
  ordered.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        r.user_email,
        r.user_full_name,
        fmt(r.check_in),
        fmt(r.check_out),
        fmt(r.created_at),
        r.user_id
      ]
        .map(escape)
        .join(',')
    )
  })

  return `\uFEFF${lines.join('\n')}`
}

export default function OrganizerEventAttendanceReportPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId

  const q = useQuery({
    queryKey: ['org-att-report', eventId],
    queryFn: () => fetchReport(eventId),
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })
  const csv = useMemo(() => (q.data ? toCsv(q.data.rows) : ''), [q.data])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['organizer', 'admin']}>
        <AppShell title="تقرير الحضور">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={`/organizer/events/${eventId}`} className="text-sm text-zinc-600 hover:text-black">
                ← رجوع
              </Link>
              <div className="text-xs text-zinc-500">تقرير الحضور</div>
            </div>

            {q.data && (
              <button
                className="h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90"
                onClick={async () => {
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `attendance-${eventId}.csv`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                }}
              >
                تصدير CSV
              </button>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-2xl font-black tracking-tight">تقرير الحضور</div>
                  <div className="mt-2 text-sm text-zinc-600">يعرض سجلات الدخول/الانصراف لهذه الفعالية فقط.</div>
                </div>
                {q.data?.event?.title && (
                  <div className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-zinc-700">{q.data.event.title}</div>
                )}
              </div>
            </div>

            <div className="p-6">
              {q.isLoading && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                        <div className="h-3 w-20 rounded bg-zinc-200" />
                        <div className="mt-3 h-8 w-16 rounded bg-zinc-200" />
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 h-72 rounded-3xl border border-black/10 bg-zinc-50" />
                </>
              )}

              {q.isError && (
                <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  تعذر تحميل التقرير. تأكد أنك منظّم هذه الفعالية أو Admin.
                </div>
              )}

              {q.data && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">الإجمالي</div>
                      <div className="mt-1 text-2xl font-extrabold">{q.data.stats.total}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">تم تسجيل دخول</div>
                      <div className="mt-1 text-2xl font-extrabold">{q.data.stats.checked_in}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">تم تسجيل انصراف</div>
                      <div className="mt-1 text-2xl font-extrabold">{q.data.stats.checked_out}</div>
                    </div>
                  </div>

                  <div className="mt-8 overflow-hidden rounded-3xl border border-black/10">
                    <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 border-b border-black/10 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">
                      <div>المتطوع</div>
                      <div>الدخول</div>
                      <div>الانصراف</div>
                    </div>

                    {q.data.rows.length === 0 && (
                      <div className="bg-white px-4 py-10 text-center">
                        <div className="text-lg font-extrabold">لا يوجد حضور بعد</div>
                        <div className="mt-2 text-sm text-zinc-600">عند بدء المسح في صفحة التحضير ستظهر السجلات هنا.</div>
                      </div>
                    )}

                    {q.data.rows.map((r) => (
                      <div key={r.id} className="grid grid-cols-[1.2fr_1fr_1fr] gap-3 border-b border-black/5 bg-white px-4 py-3 text-sm">
                        <div>
                          <div className="font-semibold">{r.user_full_name ?? '—'}</div>
                          <div className="text-xs text-zinc-500">{r.user_email ?? ''}</div>
                        </div>
                        <div className="font-mono text-xs text-zinc-700">{r.check_in ?? '—'}</div>
                        <div className="font-mono text-xs text-zinc-700">{r.check_out ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
