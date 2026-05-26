'use client'

import Link from 'next/link'

export default function AccountSuspendedPage() {
  return (
    <main className="min-h-screen bg-[#0D0C0A] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl border border-[#C9A84C]/20 bg-[#1A1814] p-8">
        <div className="text-2xl font-black">عذرًا، تم إيقاف حسابك</div>
        <div className="mt-3 text-sm text-white/80">
          حسابك موقوف حاليًا من الإدارة. إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق الدعم/الإدارة.
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/auth"
            className="h-11 rounded-2xl bg-[#C9A84C] px-5 text-sm font-extrabold text-[#0D0C0A] hover:bg-[#E8C97A] flex items-center"
          >
            تسجيل دخول بحساب آخر
          </Link>
          <Link
            href="/"
            className="h-11 rounded-2xl border border-[#C9A84C]/20 bg-transparent px-5 text-sm font-semibold text-white/70 hover:text-[#C9A84C] flex items-center"
          >
            الصفحة التعريفية
          </Link>
        </div>
      </div>
    </main>
  )
}
