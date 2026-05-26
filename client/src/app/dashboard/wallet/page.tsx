'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabaseClient'
import { LucideAward, LucideBadgeCheck, LucideDownload, LucideHistory, LucideMedal, LucideShieldCheck } from 'lucide-react'

// Skeleton Component for Loading State
const SkeletonCard = () => (
  <div className="animate-pulse rounded-3xl border border-black/5 bg-zinc-50 p-6">
    <div className="h-12 w-12 rounded-2xl bg-zinc-200 mb-4" />
    <div className="h-4 w-3/4 bg-zinc-200 rounded mb-2" />
    <div className="h-3 w-1/2 bg-zinc-100 rounded" />
  </div>
)

export default function WalletPage() {
  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ['my-badges-v4'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const { data, error } = await supabase
        .from('user_badges')
        .select('id, badge:badges(*)')
        .eq('user_id', session.user.id)
      if (error) throw error
      return data
    }
  })

  const { data: certificates, isLoading: certsLoading } = useQuery({
    queryKey: ['my-certificates-v4'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const { data, error } = await supabase
        .from('certificates')
        .select('*, event:events(title, date, description)')
        .eq('user_id', session.user.id)
      if (error) throw error
      return data
    }
  })

  return (
    <AuthGate title="الرجاء تسجيل الدخول لعرض محفظتك">
      <AppShell title="المحفظة الرقمية">
        <div className="space-y-8 pb-24">
          
          {/* Header Section */}
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white shadow-xl shadow-emerald-500/20">
            <div className="relative z-10">
              <h2 className="text-2xl font-black mb-2 flex items-center gap-2">
                <LucideShieldCheck className="text-emerald-200" />
                سجل إنجازاتك
              </h2>
              <p className="text-emerald-50/70 text-sm leading-relaxed max-w-xs">
                هنا تجد جميع الأوسمة والشهادات التي حصلت عليها خلال مسيرتك التطوعية.
              </p>
            </div>
            <LucideAward size={120} className="absolute -right-8 -bottom-8 text-white/10 rotate-12" />
          </div>

          {/* Badges Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black flex items-center gap-2">
                <LucideMedal className="text-amber-500" />
                الأوسمة المستحقة
              </h3>
              <span className="text-xs font-bold text-[#0D0C0A] bg-zinc-100 px-3 py-1 rounded-full">
                {badges?.length || 0} أوسمة
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {badgesLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : (badges?.length ?? 0) > 0 ? (
                badges?.map((b: any) => (
                  <div key={b.id} className="group relative overflow-hidden rounded-3xl border border-black/5 bg-white p-6 shadow-sm hover:border-amber-500/30 transition-all duration-300">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 mb-4 text-2xl">
                      {b.badge?.icon || '🏆'}
                    </div>
                    {/* Fix: use b.badge.title instead of b.badge.name */}
                    <div className="text-sm font-black text-zinc-900 mb-1">{b.badge?.title || b.badge?.name}</div>
                    <div className="text-[10px] text-zinc-500 line-clamp-2">{b.badge?.description}</div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-12 text-center rounded-3xl border-2 border-dashed border-zinc-100">
                  <LucideMedal size={40} className="mx-auto text-zinc-200 mb-3" />
                  <p className="text-sm text-zinc-400 font-bold">لا توجد أوسمة حالياً</p>
                </div>
              )}
            </div>
          </section>

          {/* Certificates Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black flex items-center gap-2">
                <LucideBadgeCheck className="text-blue-500" />
                الشهادات الموثقة
              </h3>
            </div>

            <div className="space-y-3">
              {certsLoading ? (
                <div className="animate-pulse h-20 bg-zinc-50 rounded-2xl border border-black/5" />
              ) : (certificates?.length ?? 0) > 0 ? (
                certificates?.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl border border-black/5 bg-white hover:bg-zinc-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <LucideHistory size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-zinc-900">{c.event?.title}</div>
                        <div className="text-[10px] text-zinc-400">{new Date(c.event?.date || c.created_at).toLocaleDateString('ar-SA')}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => alert('سيتم تفعيل تحميل الشهادة بصيغة PDF قريباً في التحديث القادم!')}
                      className="h-10 w-10 rounded-xl bg-zinc-100 text-zinc-600 hover:bg-black hover:text-white transition-all flex items-center justify-center"
                    >
                      <LucideDownload size={18} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center rounded-3xl border-2 border-dashed border-zinc-100">
                  <p className="text-sm text-zinc-400 font-bold">لم تصدر أي شهادات بعد</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </AppShell>
    </AuthGate>
  )
}
