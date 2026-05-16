'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'
import { LucideSearch, LucideX, LucideCalendar, LucideChevronRight, LucideClock, LucideTag, LucideUsers, LucideStar, LucideSparkles, LucideArrowRight } from 'lucide-react'

// Skeleton Loader for Event Cards
const EventSkeleton = () => (
  <div className="animate-pulse rounded-[2.5rem] border border-black/5 bg-white p-8 h-[300px]">
    <div className="h-6 w-1/4 bg-zinc-100 rounded-full mb-6" />
    <div className="h-8 w-3/4 bg-zinc-200 rounded mb-4" />
    <div className="h-4 w-full bg-zinc-100 rounded mb-2" />
    <div className="h-4 w-2/3 bg-zinc-100 rounded mb-8" />
    <div className="flex gap-2">
      <div className="h-8 w-20 bg-zinc-50 rounded-xl" />
      <div className="h-8 w-20 bg-zinc-50 rounded-xl" />
    </div>
  </div>
)

export default function EventsPage() {
  const [qText, setQText] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'registered'>('all')

  const events = useQuery({
    queryKey: ['events-v2'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: any[] }>('/api/events')
      return res.data.data
    },
    refetchInterval: 10000
  })

  const regs = useQuery({
    queryKey: ['my-registrations-v2'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: any[] }>('/api/me/registrations')
      return res.data.data
    }
  })

  const regSet = useMemo(() => new Set((regs.data ?? []).map((r) => String(r.event_id))), [regs.data])

  const filtered = useMemo(() => {
    let list = events.data ?? []
    if (activeTab === 'registered') list = list.filter(e => regSet.has(String(e.id)))
    const t = qText.trim().toLowerCase()
    if (!t) return list
    return list.filter((e) => (e.title ?? '').toLowerCase().includes(t) || (e.description ?? '').toLowerCase().includes(t))
  }, [events.data, qText, activeTab, regSet])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="الفرص التطوعية">
        <div className="space-y-6 pb-20">
          
          {/* Header & Search */}
          <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-black p-8 text-white shadow-xl shadow-black/10">
            <h2 className="text-2xl font-black mb-6">اكتشف فرصتك القادمة 🚀</h2>
            <div className="relative">
              <LucideSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                className="h-14 w-full rounded-2xl bg-white/10 pr-11 pl-4 text-sm outline-none focus:bg-white focus:text-black transition-all border border-white/5"
                placeholder="ابحث بالعنوان أو الوصف..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
              {qText && (
                <button onClick={() => setQText('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white">
                  <LucideX size={16} />
                </button>
              )}
            </div>
            
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'all' ? 'bg-[#C9A84C] text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                جميع الفرص
              </button>
              <button
                onClick={() => setActiveTab('registered')}
                className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'registered' ? 'bg-[#C9A84C] text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 text-zinc-400 hover:bg-white/10'}`}
              >
                فرصي المسجلة
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="grid gap-6 sm:grid-cols-2">
            {events.isLoading ? (
              <>
                <EventSkeleton />
                <EventSkeleton />
              </>
            ) : filtered.length > 0 ? (
              filtered.map((e) => {
                const registered = regSet.has(String(e.id))
                return (
                  <Link 
                    key={e.id} 
                    href={`/events/${e.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-black/5 bg-white shadow-sm hover:shadow-xl hover:border-amber-500/30 transition-all duration-500"
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${registered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {registered ? <LucideStar size={12} fill="currentColor" /> : <LucideSparkles size={12} />}
                          <span>{registered ? 'أنت مسجل' : 'فرصة متاحة'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">#{e.id.slice(0,4)}</span>
                      </div>

                      <h3 className="text-xl font-black text-black group-hover:text-amber-600 transition-colors line-clamp-1 mb-3">
                        {e.title}
                      </h3>
                      
                      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-6">
                        {e.description || 'انضم إلينا للمساهمة في خدمة المجتمع وتطوير مهاراتك الشخصية.'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-[10px] font-bold text-zinc-600">
                          <LucideCalendar size={14} className="text-amber-500" />
                          {e.start_time ? new Date(e.start_time).toLocaleDateString('ar-SA') : 'قريباً'}
                        </div>
                        <div className="flex items-center gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-[10px] font-bold text-zinc-600">
                          <LucideClock size={14} className="text-amber-500" />
                          {e.start_time ? new Date(e.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-black/5 bg-zinc-50/50 p-6 flex items-center justify-between group-hover:bg-amber-50 transition-colors">
                      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-400">
                        <LucideTag size={12} />
                        عرض التفاصيل
                      </div>
                      <LucideArrowRight size={18} className="text-zinc-300 group-hover:text-amber-600 group-hover:translate-x-[-4px] transition-all" />
                    </div>
                  </Link>
                )
              })
            ) : (
              <div className="col-span-full py-20 text-center rounded-[3rem] border-2 border-dashed border-zinc-100 bg-zinc-50/50">
                <LucideCalendar size={48} className="mx-auto text-zinc-200 mb-4" />
                <div className="text-lg font-black text-zinc-400">لا توجد فعاليات بهذا الاسم</div>
                <button onClick={() => setQText('')} className="mt-4 text-sm font-black text-amber-600 underline">عرض جميع الفعاليات</button>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </AuthGate>
  )
}
