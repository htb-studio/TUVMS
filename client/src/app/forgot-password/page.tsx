'use client'

import Link from 'next/link'
import { LucideArrowRight, LucideShieldCheck, LucidePhone, LucideMail, LucideMessageCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#0D0C0A] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12 relative">
        <div className="w-full rounded-3xl border border-[#C9A84C]/25 bg-[#1A1814] p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
          <div className="text-center">
            <div className="text-2xl font-black text-[#C9A84C]">نادي التطوع</div>
            <div className="mt-2 text-[11px] tracking-[0.25em] text-white/35">TUVMS — TAIF UNIVERSITY</div>
            <div className="mt-6 text-lg font-extrabold">استعادة كلمة المرور</div>
            <div className="mt-2 text-sm text-white/45">
              لضمان أمان حسابك، نستخدم التحقق اليدوي عبر الواتساب
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-[#C9A84C]/15 bg-white/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center border border-[#C9A84C]/30">
                <LucideShieldCheck className="text-[#C9A84C]" size={24} />
              </div>
              <div>
                <div className="text-sm font-black text-white">التحقق اليدوي</div>
                <div className="text-xs text-white/45">للحماية من محاولات الاختراق</div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-[#C9A84C]/20 bg-white/5 p-4">
                <div className="text-xs font-bold text-white/45 mb-2">تواصل معنا عبر الواتساب</div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                    <LucideMessageCircle className="text-emerald-400" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">حاتم طلال المطيري</div>
                    <div className="text-xs text-white/45">قائد لجنة تقنية المعلومات</div>
                  </div>
                </div>
                <a
                  href="https://wa.me/966575167177"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 h-11 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all"
                >
                  <LucidePhone size={18} />
                  0575167177
                </a>
              </div>

              <div className="rounded-2xl border border-[#C9A84C]/20 bg-white/5 p-4">
                <div className="text-xs font-bold text-white/45 mb-2">أو عبر البريد الإلكتروني</div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <LucideMail className="text-blue-400" size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">حسابك الجامعي</div>
                    <div className="text-xs text-white/45">أرسل من بريدك الجامعي المسجل</div>
                  </div>
                </div>
                <a
                  href="mailto:halmutairi@athar.it.com"
                  className="mt-3 flex items-center justify-center gap-2 h-11 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-all"
                >
                  <LucideMail size={18} />
                  halmutairi@athar.it.com
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="text-xs font-bold text-amber-200 mb-2">خطوات استعادة كلمة المرور:</div>
              <ol className="space-y-2 text-xs text-amber-100/80 list-decimal list-inside">
                <li>تواصل معنا عبر الواتساب أو البريد الإلكتروني</li>
                <li>قدم معلومات هويتك (الاسم والرقم الجامعي)</li>
                <li>بعد التحقق، سأرسل لك رابط إعادة التعيين</li>
                <li>استخدم الرابط لتعيين كلمة مرور جديدة</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-white/45">
            <Link href="/auth" className="text-[#C9A84C] font-bold hover:text-[#E8C97A] flex items-center justify-center gap-2">
              <LucideArrowRight size={16} className="rotate-180" />
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
