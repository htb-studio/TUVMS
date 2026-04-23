'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useMemo } from 'react'

export default function DashboardPage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{
        ok: boolean
        data: {
          full_name: string | null
          email?: string | null
          role: string
          gender: 'male' | 'female' | null
          university_id: string | null
          national_id: string | null
          birth_date: string | null
          phone: string | null
          college: string | null
          department: string | null
          academic_level: string | null
          skills: any
          membership_status?: 'active' | 'suspended' | 'revoked' | null
        }
      }>('/api/me')
      return res.data.data
    }
  })

  const role = useMemo(() => (me.data?.role ?? 'volunteer') as 'volunteer' | 'organizer' | 'admin', [me.data?.role])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="لوحة التحكم">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <div className="text-lg font-black">مرحبًا{me.data?.full_name ? `، ${me.data.full_name}` : ''}</div>
            <div className="mt-2 text-sm text-zinc-600">نقطة انطلاق سريعة لكل ما تحتاجه في TUVMS.</div>
          </div>
          <div className="p-6">
            {me.isLoading ? (
              <div className="mb-6 overflow-hidden rounded-3xl border border-black/10 bg-white p-6">
                <div className="animate-pulse">
                  <div className="h-4 w-40 rounded bg-zinc-200" />
                  <div className="mt-3 h-3 w-64 rounded bg-zinc-200" />
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="h-24 rounded-3xl bg-zinc-100" />
                    <div className="h-24 rounded-3xl bg-zinc-100" />
                  </div>
                </div>
              </div>
            ) : me.isError ? (
              <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="text-sm font-extrabold text-red-800">تعذر تحميل بيانات الملف</div>
                <div className="mt-2 text-sm text-red-700">حاول تحديث الصفحة أو تسجيل الخروج ثم الدخول مرة أخرى.</div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/events"
                className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02] transition"
              >
                <div className="text-sm font-extrabold">تصفح الفرص التطوعية</div>
                <div className="mt-2 text-sm text-zinc-600">ابحث وسجّل واحصل على QR.</div>
              </Link>

              {role === 'organizer' || role === 'admin' ? (
                <Link
                  href="/organizer"
                  className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02] transition"
                >
                  <div className="text-sm font-extrabold">لوحة المنظم</div>
                  <div className="mt-2 text-sm text-zinc-600">إنشاء فعاليات ومتابعة الحضور والتقارير.</div>
                </Link>
              ) : (
                <Link
                  href="/dashboard/card"
                  className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02] transition"
                >
                  <div className="text-sm font-extrabold">البطاقة الرقمية</div>
                  <div className="mt-2 text-sm text-zinc-600">تحقق سريع بالـ QR وحالة العضوية.</div>
                </Link>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href="/dashboard/wallet"
                className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02] transition"
              >
                <div className="text-sm font-extrabold">المحفظة</div>
                <div className="mt-2 text-sm text-zinc-600">شهاداتك وأوسمتك في مكان واحد.</div>
              </Link>

              <Link
                href="/dashboard/card"
                className="rounded-3xl border border-black/10 bg-white p-6 hover:bg-black/[0.02] transition"
              >
                <div className="text-sm font-extrabold">البطاقة الرقمية</div>
                <div className="mt-2 text-sm text-zinc-600">وجه وقفى + تحقق سريع بالـ QR.</div>
              </Link>
            </div>

            <div className="mt-10 text-center text-sm text-zinc-500">
              صنع بقلب من متطوعين نادي التطوع بـ جامعة الطائف —{' '}
              <a href="https://www.tu.edu.sa" target="_blank" rel="noreferrer" className="font-bold text-[#8B6914] hover:underline">
                جامعة الطائف
              </a>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
