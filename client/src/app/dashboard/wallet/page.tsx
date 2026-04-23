'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'
import Link from 'next/link'

export default function WalletPage() {
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{
        ok: boolean
        data: {
          full_name: string | null
          role: string
        }
      }>('/api/me')
      return res.data.data
    }
  })

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="المحفظة">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black">المحفظة</div>
                <div className="mt-2 text-sm text-zinc-600">شهاداتك وأوسمتك في مكان واحد.</div>
              </div>
              <Link
                href="/dashboard"
                className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03]"
              >
                رجوع
              </Link>
            </div>
          </div>

          <div className="p-6">
            {me.isLoading ? (
              <div className="mb-6 overflow-hidden rounded-3xl border border-black/10 bg-white p-6">
                <div className="animate-pulse">
                  <div className="h-4 w-40 rounded bg-zinc-200" />
                  <div className="mt-3 h-3 w-64 rounded bg-zinc-200" />
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="h-28 rounded-3xl bg-zinc-100" />
                    <div className="h-28 rounded-3xl bg-zinc-100" />
                  </div>
                </div>
              </div>
            ) : me.isError ? (
              <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="text-sm font-extrabold text-red-800">تعذر تحميل بيانات المستخدم</div>
                <div className="mt-2 text-sm text-red-700">حاول تحديث الصفحة أو تسجيل الخروج ثم الدخول مرة أخرى.</div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-black/10 bg-white p-6">
                <div className="text-sm font-extrabold">الشهادات</div>
                <div className="mt-2 text-sm text-zinc-600">ستظهر هنا الشهادات المعتمدة بصيغة PDF.</div>
                <div className="mt-4 rounded-3xl border border-black/10 bg-zinc-50/70 p-5">
                  <div className="text-sm font-semibold text-zinc-700">لا توجد شهادات بعد</div>
                  <div className="mt-2 text-sm text-zinc-600">بعد اعتماد مشاركاتك في الفعاليات، سيتم توفير الشهادة تلقائيًا.</div>
                </div>
              </div>

              <div className="rounded-3xl border border-black/10 bg-white p-6">
                <div className="text-sm font-extrabold">الأوسمة</div>
                <div className="mt-2 text-sm text-zinc-600">سيتم إضافة الأوسمة حسب مشاركاتك.</div>
                <div className="mt-4 rounded-3xl border border-black/10 bg-zinc-50/70 p-5">
                  <div className="text-sm font-semibold text-zinc-700">لا توجد أوسمة بعد</div>
                  <div className="mt-2 text-sm text-zinc-600">احصل على أول وسام بعد إكمال أول فرصة تطوعية.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
