'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { api } from '@/lib/api'

type AdminEvent = {
  id: string
  title: string
  created_at: string
  date: string | null
  start_time: string | null
  end_time: string | null
  admin_tag?: string | null
  certificate_text?: string | null
}

async function adminGetEvent(eventId: string) {
  const res = await api.get<{ ok: boolean; data: AdminEvent }>(`/api/admin/events/${eventId}`)
  return res.data.data
}

async function adminUpdateEvent(eventId: string, patch: Partial<AdminEvent>) {
  const res = await api.post<{ ok: boolean; data: AdminEvent }>(`/api/admin/events/${eventId}/settings`, patch)
  return res.data.data
}

export default function GodAdminEventSettingsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['admin-event', eventId],
    queryFn: () => adminGetEvent(eventId),
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const update = useMutation({
    mutationFn: async (vars: { patch: Partial<AdminEvent> }) => adminUpdateEvent(eventId, vars.patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-event', eventId] })
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    }
  })

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['admin']}>
        <AppShell title="إعدادات الفعالية (أدمن)">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/godadmimtuvms" className="text-sm text-zinc-600 hover:text-black">
              ← رجوع
            </Link>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              {q.isLoading && <div className="text-sm text-zinc-600">جاري تحميل الفعالية…</div>}
              {q.isError && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل الفعالية.</div>
              )}
              {q.data && (
                <div>
                  <div className="text-2xl font-black tracking-tight">{q.data.title}</div>
                  <div className="mt-1 font-mono text-xs text-zinc-500 break-all">{q.data.id}</div>
                </div>
              )}
            </div>

            {q.data && (
              <div className="p-6 grid gap-4">
                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs font-bold text-zinc-600">وسم الفعالية</div>
                  <input
                    className="mt-2 h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm outline-none"
                    defaultValue={q.data.admin_tag ?? ''}
                    placeholder="مثال: تم اعتماد الشهادات"
                    onBlur={(e) => {
                      const v = e.target.value
                      if ((q.data?.admin_tag ?? '') === v) return
                      update.mutate({ patch: { admin_tag: v || null } })
                    }}
                    disabled={update.isPending}
                  />
                  <div className="mt-2 text-xs text-zinc-500">ملاحظة داخلية للأدمن لتسهيل المتابعة.</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                  <div className="text-xs font-bold text-zinc-600">نص الشهادة / رسالة منصة العمل التطوعي</div>
                  <textarea
                    className="mt-2 min-h-[140px] w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
                    defaultValue={q.data.certificate_text ?? ''}
                    placeholder="مثال: شكراً لحضورك. تم تسجيل الشهادات في منصة العمل التطوعي."
                    onBlur={(e) => {
                      const v = e.target.value
                      if ((q.data?.certificate_text ?? '') === v) return
                      update.mutate({ patch: { certificate_text: v || null } })
                    }}
                    disabled={update.isPending}
                  />
                  <div className="mt-2 text-xs text-zinc-500">
                    الفائدة: تكتب رسالة جاهزة تُعرض للطالب (مثال: تم رفع الشهادة في منصة العمل التطوعي، أو رابط التسجيل…)
                  </div>
                </div>
              </div>
            )}
          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
