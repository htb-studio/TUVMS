'use client'

import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'

type AdminUserProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: 'volunteer' | 'organizer' | 'admin'
  created_at: string
  phone?: string | null
  university_id?: string | null
  national_id?: string | null
  gender?: string | null
  department?: string | null
  college?: string | null
  academic_level?: string | null
  birth_date?: string | null
  membership_status?: 'active' | 'suspended' | 'revoked' | null
}

type AttendanceRow = {
  id: string
  event_id: string
  check_in: string | null
  check_out: string | null
  created_at: string
  event: {
    id: string
    title: string
    date: string | null
    start_time: string | null
    end_time: string | null
  } | null
}

export default function AdminUserPage() {
  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['admin']}>
        <AdminUserBody />
      </RoleGate>
    </AuthGate>
  )
}

function AdminUserBody() {
  const params = useParams<{ userId: string }>()
  const userId = params.userId
  const qc = useQueryClient()
  const [resetLink, setResetLink] = useState<string>('')

  const user = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: AdminUserProfile }>(`/api/admin/users/${userId}`)
      return res.data.data
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const attendance = useQuery({
    queryKey: ['admin-user-attendance', userId],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: AttendanceRow[] }>(`/api/admin/users/${userId}/attendance`)
      return res.data.data
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const setStatus = useMutation({
    mutationFn: async (membership_status: 'active' | 'suspended' | 'revoked' | '') => {
      const res = await api.post<{ ok: boolean; data: any }>(`/api/admin/users/${userId}/status`, { membership_status })
      return res.data.data
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-user', userId] })
    }
  })

  const resetPassword = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ ok: boolean; data: { email: string; action_link: string | null } }>(
        `/api/admin/users/${userId}/reset-password`
      )
      return res.data.data
    },
    onSuccess: (data) => {
      setResetLink(data.action_link ?? '')
    }
  })

  return (
    <AppShell title="ملف العضو">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/godadmimtuvms" className="text-sm text-zinc-600 hover:text-black">
          ← رجوع
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
        <div className="border-b border-black/5 bg-zinc-50/70 p-6">
          <h1 className="text-3xl font-black tracking-tight">ملف العضو</h1>
          <p className="mt-2 text-sm text-zinc-600">عرض بيانات العضو + إدارة الحالة + رابط إعادة تعيين كلمة المرور.</p>
        </div>

        <div className="p-6">
          {user.isLoading && <div className="text-sm text-zinc-600">جاري تحميل البيانات…</div>}
          {user.isError && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل بيانات العضو.</div>
          )}

          {user.data && (
            <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div>
                <div className="rounded-3xl border border-black/10 bg-white p-6">
                  <div className="text-sm font-extrabold">المعلومات الأساسية</div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">الاسم</div>
                      <div className="mt-1 text-sm font-bold">{user.data.full_name ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">البريد</div>
                      <div className="mt-1 text-sm font-bold break-all">{user.data.email ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">رقم الجوال</div>
                      <div className="mt-1 text-sm font-bold">{user.data.phone ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">الرقم الجامعي</div>
                      <div className="mt-1 text-sm font-bold">{user.data.university_id ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">رقم الهوية</div>
                      <div className="mt-1 text-sm font-bold">{user.data.national_id ?? '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-black/10 bg-zinc-50 p-4">
                      <div className="text-xs text-zinc-500">الحالة</div>
                      <div className="mt-1 text-sm font-bold">{user.data.membership_status ?? '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
                  <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                    <div className="text-lg font-black">الفعاليات التي حضرها</div>
                    <div className="mt-2 text-sm text-zinc-600">حسب جدول الحضور.</div>
                  </div>
                  <div className="p-6">
                    {attendance.isLoading && <div className="text-sm text-zinc-600">جاري تحميل السجل…</div>}
                    {attendance.isError && (
                      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">تعذر تحميل سجل الحضور.</div>
                    )}
                    {attendance.data && attendance.data.length === 0 && (
                      <div className="rounded-3xl border border-black/10 bg-white p-8 text-center">
                        <div className="text-sm font-extrabold">لا يوجد حضور مسجل</div>
                      </div>
                    )}
                    {attendance.data && attendance.data.length > 0 && (
                      <div className="grid gap-2">
                        {attendance.data.map((r) => (
                          <div key={r.id} className="rounded-3xl border border-black/10 bg-white p-5">
                            <div className="text-sm font-extrabold">{r.event?.title ?? r.event_id}</div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-3">
                              <div className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
                                <div className="text-xs text-zinc-500">الدخول</div>
                                <div className="mt-1 font-mono text-xs text-zinc-700">{r.check_in ?? '—'}</div>
                              </div>
                              <div className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
                                <div className="text-xs text-zinc-500">الانصراف</div>
                                <div className="mt-1 font-mono text-xs text-zinc-700">{r.check_out ?? '—'}</div>
                              </div>
                              <div className="rounded-2xl border border-black/10 bg-zinc-50 p-3">
                                <div className="text-xs text-zinc-500">آخر تحديث</div>
                                <div className="mt-1 font-mono text-xs text-zinc-700">{r.created_at ?? '—'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-black/10 bg-white">
                <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                  <div className="text-lg font-black">إدارة العضو</div>
                  <div className="mt-2 text-sm text-zinc-600">إجراءات خاصة بالأدمن فقط.</div>
                </div>
                <div className="p-6">
                  <div className="text-xs font-bold text-zinc-600">تغيير حالة الحساب</div>
                  <div className="mt-3 grid gap-2">
                    <button
                      type="button"
                      className="h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:opacity-60"
                      onClick={() => setStatus.mutate('active')}
                      disabled={setStatus.isPending}
                    >
                      تفعيل
                    </button>
                    <button
                      type="button"
                      className="h-11 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                      onClick={() => setStatus.mutate('suspended')}
                      disabled={setStatus.isPending}
                    >
                      إيقاف مؤقت
                    </button>
                    <button
                      type="button"
                      className="h-11 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
                      onClick={() => setStatus.mutate('revoked')}
                      disabled={setStatus.isPending}
                    >
                      حظر
                    </button>
                  </div>

                  <div className="mt-8">
                    <div className="text-xs font-bold text-zinc-600">إعادة تعيين كلمة المرور</div>
                    <button
                      type="button"
                      className="mt-3 h-11 w-full rounded-2xl bg-black px-4 text-sm font-semibold text-white hover:bg-black/90 disabled:opacity-60"
                      onClick={() => resetPassword.mutate()}
                      disabled={resetPassword.isPending}
                    >
                      {resetPassword.isPending ? 'جاري الإنشاء…' : 'إنشاء رابط إعادة تعيين'}
                    </button>

                    {resetLink && (
                      <div className="mt-4 rounded-3xl border border-black/10 bg-zinc-50 p-4">
                        <div className="text-xs font-bold text-zinc-600">الرابط</div>
                        <div className="mt-2 break-all font-mono text-xs text-zinc-700">{resetLink}</div>
                        <button
                          type="button"
                          className="mt-3 h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03]"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(resetLink)
                            } catch {
                              window.prompt('انسخ الرابط:', resetLink)
                            }
                          }}
                        >
                          نسخ الرابط
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
