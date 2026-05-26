'use client'

import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabaseClient'
import { LucideAward, LucideCalendar, LucideClock, LucideMapPin, LucideUsers, LucideArrowRight, LucideCheckCircle2, LucideQrCode, LucideAlertCircle, LucideLock, LucideXCircle } from 'lucide-react'

const DetailsSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-64 rounded-[2.5rem] bg-zinc-100" />
    <div className="space-y-3">
      <div className="h-8 w-1/3 bg-zinc-100 rounded" />
      <div className="h-4 w-full bg-zinc-50 rounded" />
      <div className="h-4 w-5/6 bg-zinc-50 rounded" />
    </div>
  </div>
)

export default function EventDetailsPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const qc = useQueryClient()

  const ev = useQuery({
    queryKey: ['event-v2', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()
      if (error) throw error
      if (!data) throw new Error('Event not found')
      return data
    }
  })

  const regs = useQuery({
    queryKey: ['my-registrations-v2'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const { data, error } = await supabase
        .from('registrations')
        .select('event_id, created_at')
        .eq('user_id', session.user.id)
      if (error) throw error
      return data
    }
  })

  const availability = useQuery({
    queryKey: ['event-availability-v2', eventId],
    queryFn: async () => {
      const [evRes, regRes] = await Promise.all([
        supabase.from('events').select('capacity').eq('id', eventId).single(),
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('event_id', eventId)
      ])
      
      const capacity = evRes.data?.capacity || 0
      const registeredCount = regRes.count || 0
      
      return { 
        capacity, 
        registeredCount, 
        isFull: registeredCount >= capacity 
      }
    },
    enabled: !!eventId
  })

  const registered = (regs.data ?? []).some((r) => String(r.event_id) === String(eventId))
  const isFull = !!availability.data?.isFull
  const event = ev.data
  const isClosed = event?.is_closed === true

  const register = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { data: evData } = await supabase.from('events').select('*').eq('id', eventId).single()
      if (evData?.is_closed) throw new Error('Registration closed')

      const token = Math.random().toString(36).substring(2)
      const { data, error } = await supabase
        .from('registrations')
        .insert({ 
          user_id: session.user.id, 
          event_id: eventId, 
          token,
          qr_payload: { user_id: session.user.id, event_id: eventId, token }
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-registrations-v2'] })
      qc.invalidateQueries({ queryKey: ['event-availability-v2', eventId] })
      alert('تم الانضمام بنجاح!')
    },
    onError: (err: any) => {
      alert('فشل الانضمام: ' + (err.message || 'حدث خطأ غير متوقع'))
    }
  })

  const withdraw = useMutation({
    mutationFn: async () => {
      if (!confirm('هل أنت متأكد من الانسحاب من هذه الفعالية؟')) {
        throw new Error('تم الإلغاء')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('user_id', session.user.id)
        .eq('event_id', eventId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-registrations-v2'] })
      qc.invalidateQueries({ queryKey: ['event-availability-v2', eventId] })
      alert('تم الانسحاب بنجاح')
    },
    onError: (err: any) => {
      if (err.message !== 'تم الإلغاء') {
        alert('فشل الانسحاب: ' + (err.message || 'حدث خطأ غير متوقع'))
      }
    }
  })

  if (ev.isLoading || regs.isLoading || availability.isLoading) return <AuthGate title="جاري التحميل..."><AppShell title="جاري التحميل..."><DetailsSkeleton /></AppShell></AuthGate>
  if (ev.isError) return <AuthGate title="خطأ"><AppShell title="خطأ"><div className="p-12 text-center font-black text-red-600">عذراً، الفعالية غير موجودة أو حدث خطأ أثناء التحميل.</div></AppShell></AuthGate>

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="تفاصيل الفرصة">
        <div className="space-y-6 pb-24">
          
          <Link href="/events" className="inline-flex items-center gap-2 text-sm font-black text-zinc-400 hover:text-black transition-colors px-2">
            <LucideArrowRight size={18} className="rotate-180" />
            العودة للفعاليات
          </Link>

          <div className="relative overflow-hidden rounded-[2.5rem] bg-black p-8 sm:p-12 text-white shadow-2xl shadow-black/20">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${registered ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30'}`}>
                  {registered ? 'تم الانضمام بنجاح' : 'فرصة متاحة الآن'}
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/5 text-white/40 text-[10px] font-black border border-white/5">
                  #{String(eventId).slice(0, 8)}
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                {event?.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors border border-white/5">
                    <LucideCalendar className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase">التاريخ</div>
                    <div className="text-sm font-black">{event?.start_time ? new Date(event.start_time).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' }) : 'قريباً'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors border border-white/5">
                    <LucideClock className="text-blue-500" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase">الوقت</div>
                    <div className="text-sm font-black">{event?.start_time ? new Date(event.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors border border-white/5">
                    <LucideUsers className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase">السعة المتبقية</div>
                    <div className="text-sm font-black">
                      {availability.data ? (availability.data.capacity - availability.data.registeredCount) : '...'} متطوع
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-20 -top-20 h-64 w-64 bg-[#C9A84C]/10 rounded-full blur-3xl" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                  <span className="h-6 w-1 bg-[#C9A84C] rounded-full" />
                  عن هذه الفرصة
                </h3>
                <div className="text-zinc-600 leading-relaxed text-base whitespace-pre-wrap">
                  {event?.description || 'لا يوجد وصف تفصيلي لهذه الفعالية حالياً.'}
                </div>
              </div>

              {registered && event?.certificate_text && (
                <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/30 p-8">
                  <h3 className="text-lg font-black text-emerald-900 mb-4 flex items-center gap-2">
                    <LucideAward size={22} className="text-emerald-600" />
                    تعليمات المتطوعين
                  </h3>
                  <div className="text-emerald-800/80 text-sm leading-relaxed">
                    {event.certificate_text}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="sticky top-6 rounded-[2rem] border border-black/10 bg-white p-8 shadow-xl shadow-black/5">
                <h3 className="text-lg font-black mb-2">حالة التسجيل</h3>
                <p className="text-xs text-zinc-400 mb-8 font-medium">سجل انضمامك الآن لتكون جزءاً من هذا العطاء.</p>

                {registered ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center py-6 px-4 rounded-3xl bg-emerald-50 border border-emerald-100 text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
                        <LucideCheckCircle2 size={24} />
                      </div>
                      <div className="text-emerald-900 font-black text-sm">أنت مسجل بالفعل!</div>
                      <p className="text-[10px] text-emerald-600/70 mt-1">يمكنك إبراز الـ QR للمنظم عند الحضور</p>
                    </div>
                    
                    <Link
                      href={`/events/${eventId}/qr`}
                      className="w-full h-14 rounded-2xl bg-black text-white font-black text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all active:scale-95"
                    >
                      <LucideQrCode size={18} />
                      إظهار بطاقة الحضور
                    </Link>

                    <button
                      onClick={() => withdraw.mutate()}
                      disabled={withdraw.isPending}
                      className="w-full h-12 rounded-2xl border border-red-200 bg-red-50 text-red-600 font-black text-sm flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <LucideXCircle size={18} />
                      {withdraw.isPending ? 'جاري الانسحاب...' : 'الانسحاب من الفعالية'}
                    </button>
                  </div>
                ) : isClosed ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 rounded-3xl bg-red-50 border border-red-100 text-center">
                    <LucideLock size={32} className="text-red-300 mb-3" />
                    <div className="text-red-900 font-black text-sm">التسجيل مغلق حالياً</div>
                    <p className="text-[10px] text-red-600/70 mt-1">عذراً، انتهت فترة التسجيل في هذه الفعالية</p>
                  </div>
                ) : isFull ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 rounded-3xl bg-zinc-50 border border-zinc-100 text-center">
                    <LucideAlertCircle size={32} className="text-zinc-300 mb-3" />
                    <div className="text-zinc-500 font-black text-sm">عذراً، المقاعد مكتملة</div>
                    <p className="text-[10px] text-zinc-400 mt-1">تابعنا للفرص القادمة</p>
                  </div>
                ) : (
                  <button
                    onClick={() => register.mutate()}
                    disabled={register.isPending}
                    className="w-full h-16 rounded-2xl bg-[#C9A84C] text-black font-black text-base flex items-center justify-center gap-2 hover:bg-[#8B6914] hover:text-white transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
                  >
                    {register.isPending ? 'جاري تسجيلك...' : 'تأكيد الانضمام الآن'}
                  </button>
                )}

                <div className="mt-8 pt-8 border-t border-black/5 flex flex-wrap gap-3">
                  <div className="flex items-center gap-3 text-zinc-400">
                    <LucideMapPin size={18} />
                    <span className="text-[10px] font-bold">مقر الفعالية: داخل الحرم الجامعي</span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(window.location.href)
                        alert('تم نسخ رابط الفعالية!')
                      } catch {
                        alert('حدث خطأ أثناء النسخ')
                      }
                    }}
                    className="mr-auto text-[10px] font-black text-amber-600 hover:underline"
                  >
                    مشاركة الرابط
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </AppShell>
    </AuthGate>
  )
}
