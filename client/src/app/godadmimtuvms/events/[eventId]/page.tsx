'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { LucideAward, LucideCalendar, LucideCheckCircle, LucideChevronRight, LucideEye, LucideEyeOff, LucideFileText, LucideLock, LucideMail, LucideSearch, LucideShieldCheck, LucideTag, LucideUserPlus, LucideXCircle, LucideArrowRight } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'

type AdminEvent = {
  id: string
  title: string
  created_at: string
  date: string | null
  start_time: string | null
  end_time: string | null
  type: string
  admin_tag?: string | null
  certificate_text?: string | null
  is_visible?: boolean
  is_closed?: boolean
}

export default function GodAdminEventSettingsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const qc = useQueryClient()

  const q = useQuery({
    queryKey: ['admin-event', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      if (error) throw error
      return data as AdminEvent
    },
    refetchInterval: 5000
  })

  const update = useMutation({
    mutationFn: async (patch: Partial<AdminEvent>) => {
      const { data, error } = await supabase
        .from('events')
        .update(patch)
        .eq('id', eventId)
        .select()
        .single()
      if (error) throw error
      return data as AdminEvent
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-event', eventId] })
      qc.invalidateQueries({ queryKey: ['admin-events'] })
      qc.invalidateQueries({ queryKey: ['events-v2'] })
      alert('تم تحديث الإعدادات بنجاح!')
    },
    onError: (err: any) => {
      alert('فشل التحديث: ' + (err.message || 'خطأ غير معروف'))
    }
  })

  if (q.isLoading) return <RoleGate allow={["admin"]}><AppShell title="جاري التحميل..."><div className="animate-pulse h-64 bg-zinc-100 rounded-[2.5rem]" /></AppShell></RoleGate>
  if (!q.data) return <RoleGate allow={["admin"]}><AppShell title="خطأ"><div className="p-10 text-center">الفعالية غير موجودة</div></AppShell></RoleGate>

  const event = q.data

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={["admin"]}>
        <AppShell title="إعدادات الفعالية">
          <div className="space-y-6 pb-24">
            
            <Link href="/godadmimtuvms" className="inline-flex items-center gap-2 text-sm font-black text-zinc-400 hover:text-black transition-colors px-2">
              <LucideArrowRight size={18} className="rotate-180" />
              العودة للوحة الإدارة
            </Link>

            <div className="rounded-[2.5rem] bg-black p-8 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center border border-[#C9A84C]/30">
                  <LucideTag className="text-[#C9A84C]" size={20} />
                </div>
                <h1 className="text-2xl font-black">{event.title}</h1>
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">إدارة الإعدادات المتقدمة للفعالية</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-[2rem] border p-6 transition-all ${event.is_visible !== false ? 'border-emerald-100 bg-white shadow-lg shadow-emerald-500/5' : 'border-zinc-200 bg-zinc-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${event.is_visible !== false ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-200 text-zinc-500'}`}>
                      {event.is_visible !== false ? <LucideEye size={24} /> : <LucideEyeOff size={24} />}
                    </div>
                    <div>
                      <div className="text-sm font-black">ظهور الفعالية</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">{event.is_visible !== false ? 'ظاهرة للمتطوعين' : 'مخفية عن الجميع'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => update.mutate({ is_visible: !(event.is_visible !== false) })}
                    disabled={update.isPending}
                    className={`h-11 px-6 rounded-xl text-xs font-black transition-all ${event.is_visible !== false ? 'bg-zinc-900 text-white hover:bg-black' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                  >
                    {update.isPending ? 'جاري...' : (event.is_visible !== false ? 'إخفاء الفعالية' : 'إظهار الفعالية')}
                  </button>
                </div>
              </div>

              <div className={`rounded-[2rem] border p-6 transition-all ${event.is_closed ? 'border-red-100 bg-white shadow-lg shadow-red-500/5' : 'border-blue-100 bg-white shadow-lg shadow-blue-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${event.is_closed ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {event.is_closed ? <LucideLock size={24} /> : <LucideCheckCircle size={24} />}
                    </div>
                    <div>
                      <div className="text-sm font-black">حالة التسجيل</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">{event.is_closed ? 'مغلق حالياً' : 'مفتوح للتسجيل'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => update.mutate({ is_closed: !event.is_closed })}
                    disabled={update.isPending}
                    className={`h-11 px-6 rounded-xl text-xs font-black transition-all ${event.is_closed ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    {update.isPending ? 'جاري...' : (event.is_closed ? 'فتح التسجيل' : 'إغلاق التسجيل')}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                <span className="h-6 w-1 bg-[#C9A84C] rounded-full" />
                تخصيص المحتوى
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 px-1">نوع الفعالية</label>
                    <select
                      className="w-full h-14 rounded-2xl border border-black/5 bg-zinc-50 px-4 text-sm font-bold focus:bg-white focus:border-[#C9A84C]/50 transition-all outline-none"
                      value={event.type || 'general'}
                      onChange={(e) => update.mutate({ type: e.target.value })}
                    >
                      <option value="general">عام (General)</option>
                      <option value="educational">تعليمي (Educational)</option>
                      <option value="social">اجتماعي (Social)</option>
                      <option value="other">أخرى (Other)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 px-1">وسم الفعالية (Admin Tag)</label>
                    <input
                      className="w-full h-14 rounded-2xl border border-black/5 bg-zinc-50 px-4 text-sm font-bold focus:bg-white focus:border-[#C9A84C]/50 transition-all outline-none"
                      placeholder="مثال: فعالية كبرى، حضور إلزامي..."
                      defaultValue={event.admin_tag || ''}
                      onBlur={(e) => update.mutate({ admin_tag: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-2 px-1">نص الشهادة / التعليمات</label>
                  <textarea
                    className="w-full min-h-[150px] rounded-2xl border border-black/5 bg-zinc-50 p-4 text-sm font-medium focus:bg-white focus:border-[#C9A84C]/50 transition-all outline-none resize-none"
                    placeholder="اكتب التعليمات التي ستظهر للمتطوعين بعد التسجيل..."
                    defaultValue={event.certificate_text || ''}
                    onBlur={(e) => update.mutate({ certificate_text: e.target.value })}
                  />
                  <p className="mt-2 text-[10px] text-zinc-400 font-medium">سيظهر هذا النص فقط للمتطوعين الذين أتموا عملية التسجيل بنجاح.</p>
                </div>
              </div>
            </div>

          </div>
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
