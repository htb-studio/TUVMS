'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { api } from '@/lib/api'
import Link from 'next/link'

type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  role: 'volunteer' | 'organizer' | 'admin'
  created_at: string
}

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

async function adminListUsers() {
  const res = await api.get<{ ok: boolean; data: AdminUser[] }>('/api/admin/users')
  return res.data.data
}

async function adminSetRole(userId: string, role: AdminUser['role']) {
  const res = await api.post<{ ok: boolean; data: any }>(`/api/admin/users/${userId}/role`, { role })
  return res.data.data
}

async function adminListEvents() {
  const res = await api.get<{ ok: boolean; data: AdminEvent[] }>('/api/admin/events')
  return res.data.data
}

export default function GodAdminPage() {
  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['admin']}>
        <AdminBody />
      </RoleGate>
    </AuthGate>
  )
}

function AdminBody() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminListUsers,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const events = useQuery({
    queryKey: ['admin-events'],
    queryFn: adminListEvents,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; role: AdminUser['role'] }) => adminSetRole(vars.userId, vars.role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
    }
  })

  return (
    <AppShell title="لوحة الأدمن">
      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
        <div className="border-b border-black/5 bg-zinc-50/70 p-6">
          <h1 className="text-3xl font-black tracking-tight">لوحة الأدمن</h1>
          <p className="mt-2 text-sm text-zinc-600">إدارة المستخدمين وترقية الصلاحيات.</p>
        </div>

        <div className="p-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            إذا لم تستطع فتح هذه الصفحة، عيّن أول مستخدم كـ <b>admin</b> يدويًا من Supabase (public.users.role).
          </div>

          {q.isLoading && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
              <div className="grid grid-cols-[1.2fr_1fr_180px] gap-3 border-b border-black/10 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">
                <div>البريد</div>
                <div>المعرف</div>
                <div>الدور</div>
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1.2fr_1fr_180px] gap-3 px-4 py-3 border-b border-black/5">
                  <div>
                    <div className="h-4 w-56 rounded bg-zinc-100" />
                    <div className="mt-2 h-3 w-40 rounded bg-zinc-100" />
                  </div>
                  <div className="h-4 w-full rounded bg-zinc-100" />
                  <div className="h-10 w-full rounded-2xl bg-zinc-100" />
                </div>
              ))}
            </div>
          )}

          {q.isError && (
            <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل المستخدمين.</div>
          )}

          {q.data && q.data.length === 0 && (
            <div className="mt-6 rounded-3xl border border-black/10 bg-white p-8 text-center shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
              <div className="text-lg font-extrabold">لا يوجد مستخدمون</div>
            </div>
          )}

          {q.data && q.data.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
              <div className="grid grid-cols-[1.2fr_1fr_180px] gap-3 border-b border-black/10 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">
                <div>البريد</div>
                <div>المعرف</div>
                <div>الدور</div>
              </div>

              {q.data.map((u) => (
                <div key={u.id} className="grid grid-cols-[1.2fr_1fr_180px] gap-3 px-4 py-3 text-sm border-b border-black/5">
                  <div>
                    <Link href={`/godadmimtuvms/users/${u.id}`} className="font-semibold hover:underline">
                      {u.email ?? '—'}
                    </Link>
                    <div className="text-xs text-zinc-500">{u.full_name ?? ''}</div>
                  </div>
                  <div className="font-mono text-xs text-zinc-600 break-all">{u.id}</div>
                  <div>
                    <select
                      value={u.role}
                      onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as any })}
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none"
                      disabled={setRole.isPending}
                    >
                      <option value="volunteer">متطوع</option>
                      <option value="organizer">منظم</option>
                      <option value="admin">أدمن</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-10 overflow-hidden rounded-3xl border border-black/10 bg-white">
            <div className="border-b border-black/5 bg-zinc-50/70 p-6">
              <h2 className="text-2xl font-black tracking-tight">إدارة الفعاليات</h2>
              <p className="mt-2 text-sm text-zinc-600">إضافة وسم للفعالية + ملاحظة نصية للشهادة لكل فعالية.</p>
            </div>

            <div className="p-6">
              {events.isLoading && <div className="text-sm text-zinc-600">جاري تحميل الفعاليات…</div>}
              {events.isError && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل الفعاليات.</div>
              )}

              {events.data && events.data.length === 0 && <div className="text-sm text-zinc-600">لا توجد فعاليات.</div>}

              {events.data && events.data.length > 0 && (
                <div className="grid gap-3">
                  {events.data.map((ev) => (
                    <div key={ev.id} className="rounded-3xl border border-black/10 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-extrabold">{ev.title}</div>
                          <div className="mt-1 font-mono text-xs text-zinc-500 break-all">{ev.id}</div>
                          {ev.admin_tag && <div className="mt-2 text-xs text-zinc-600">الوسم: {ev.admin_tag}</div>}
                        </div>
                        <Link
                          href={`/godadmimtuvms/events/${ev.id}`}
                          className="h-10 rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 flex items-center"
                        >
                          إدارة
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
