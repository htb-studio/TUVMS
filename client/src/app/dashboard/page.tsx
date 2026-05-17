'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useMemo } from 'react'
import { LucideAward, LucideCalendar, LucideChevronLeft, LucideClock, LucideFileCheck, LucideTrophy } from 'lucide-react'

export default function DashboardPage() {
  const stats = useQuery({
    queryKey: ['my-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const [regs, attend, badges] = await Promise.all([
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).not('check_in', 'is', null),
        supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id)
      ])

      return {
        eventsCount: regs.count || 0,
        attendanceCount: attend.count || 0,
        badgesCount: badges.count || 0,
        totalHours: (attend.count || 0) * 2
      }
    }
  })

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      
      if (error) throw error
      return data
    }
  })

  const role = useMemo(() => (me.data?.role ?? 'volunteer') as 'volunteer' | 'organizer' | 'admin', [me.data?.role])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="لوحة التحكم">
        <div className="space-y-6 pb-20">
          {/* Welcome Card - Modern Gradient */}
          <div className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-black p-8 text-white shadow-xl shadow-black/10">
            <div className="relative z-10">
              <div className="text-3xl font-black mb-1">
                مرحبًا{me.data?.full_name ? `، ${me.data.full_name.split(' ')[0]}` : ''} 👋
              </div>
              <p className="text-white/60 text-sm font-medium leading-relaxed">
                سعادتنا بوجودك تزداد مع كل مساهمة تطوعية تقوم بها.
                <br />
                أنت جزء مهم من رحلة العطاء في جامعة الطائف.
              </p>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute -right-10 -bottom-10 h-40 w-40 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -left-10 -top-10 h-32 w-32 bg-amber-500/10 rounded-full blur-2xl" />
          </div>
          
          {/* Modern Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <LucideClock size={20} />
                </div>
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">ساعات التطوع</span>
              </div>
              <div className="text-3xl font-black">{stats.data?.totalHours ?? 0}</div>
              <div className="mt-1 text-xs text-zinc-500 font-medium">ساعة مسجلة</div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <LucideTrophy size={20} />
                </div>
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">الأوسمة</span>
              </div>
              <div className="text-3xl font-black">{stats.data?.badgesCount ?? 0}</div>
              <div className="mt-1 text-xs text-zinc-500 font-medium">وسام استحقاق</div>
            </div>

            <div className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm col-span-2 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <LucideCalendar size={20} />
                  </div>
                  <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">الفعاليات</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{stats.data?.eventsCount ?? 0}</span>
                  <span className="text-xs text-zinc-500 font-medium">تم التسجيل فيها</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-zinc-200">#01</div>
                <div className="text-[9px] font-bold text-zinc-400 uppercase">الترتيب حالياً</div>
              </div>
            </div>
          </div>

          {/* New Grid Quick Actions */}
          <div className="space-y-4 pt-2">
            <h3 className="text-lg font-black px-2 flex items-center gap-2">
              <span className="h-6 w-1 bg-amber-500 rounded-full" />
              الوصول السريع
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/events"
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm hover:border-amber-500/30 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 mb-4">
                  <LucideCalendar size={24} />
                </div>
                <div className="text-sm font-black">الفرص المتاحة</div>
                <div className="mt-1 text-[10px] text-zinc-500">سجل في الفعاليات الجديدة</div>
              </Link>

              <Link
                href="/dashboard/wallet"
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm hover:border-emerald-500/30 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300 mb-4">
                  <LucideAward size={24} />
                </div>
                <div className="text-sm font-black">المحفظة الرقمية</div>
                <div className="mt-1 text-[10px] text-zinc-500">شهاداتك وأوسمتك</div>
              </Link>

              <Link
                href="/dashboard/card"
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm hover:border-blue-500/30 transition-all duration-300"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 mb-4">
                  <LucideFileCheck size={24} />
                </div>
                <div className="text-sm font-black">البطاقة الذكية</div>
                <div className="mt-1 text-[10px] text-zinc-500">إثبات الهوية التطوعية</div>
              </Link>

              {role === 'organizer' || role === 'admin' ? (
                <Link
                  href="/organizer"
                  className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-zinc-900 p-5 shadow-sm hover:bg-black transition-all duration-300"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white mb-4">
                    <LucideChevronLeft size={24} />
                  </div>
                  <div className="text-sm font-black text-white">إدارة النادي</div>
                  <div className="mt-1 text-[10px] text-white/40">صلاحيات المنظمين</div>
                </Link>
              ) : (
                <div className="group relative overflow-hidden rounded-[2rem] border border-black/5 bg-zinc-50/50 p-5 opacity-60">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-200 text-zinc-400 mb-4">
                    <LucideTrophy size={24} />
                  </div>
                  <div className="text-sm font-black text-zinc-400">نظام الرتب</div>
                  <div className="mt-1 text-[10px] text-zinc-400">قريباً في التحديث</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              TUVMS — TAIF UNIVERSITY
            </div>
            <p className="mt-4 text-[10px] text-zinc-400 font-medium">
              نعمل معاً لبناء مجتمع تطوعي واعي ومبادر
            </p>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
