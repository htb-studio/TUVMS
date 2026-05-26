'use client'

import Link from 'next/link'
import { landingContent } from '@/content/landing'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { LucideCalendar, LucideClock, LucideMapPin, LucideCheckCircle, LucideXCircle } from 'lucide-react'

export default function HomePage() {
  const c = landingContent

  // Fetch public events
  const events = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_visible', true)
        .order('start_time', { ascending: true })
        .limit(5)
      if (error) throw error
      return data
    }
  })

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0D0C0A] via-[#1A1814] to-[#0D0C0A] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#C9A84C]/20 blur-3xl animate-pulse" />
        <div className="absolute top-20 right-20 h-80 w-80 rounded-full bg-[#E8C97A]/15 blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#C9A84C]/10 blur-3xl animate-pulse delay-500" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.03'%3E%3Cpath d='M30 30h30v30H30zM0 0h30v30H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 text-[#C9A84C] text-xs font-bold tracking-[0.2em] mb-6">
            <span className="w-2 h-2 rounded-full bg-[#C9A84C] animate-pulse" />
            {c.eyebrow}
          </div>
          <h1 className="mt-6 text-5xl sm:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tight">
            {c.title.before}
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] animate-gradient">{c.title.highlight}</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg sm:text-xl text-white/70 leading-relaxed font-medium">
            {c.subtitle}
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link href={c.primaryCta.href} className="group h-14 px-8 rounded-2xl bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#0D0C0A] font-extrabold text-base hover:shadow-2xl hover:shadow-[#C9A84C]/30 transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
              {c.primaryCta.label}
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <Link href={c.secondaryCta.href} className="h-14 px-8 rounded-2xl border-2 border-[#C9A84C]/30 bg-transparent text-white font-semibold text-base hover:bg-[#C9A84C]/10 hover:border-[#C9A84C] transition-all duration-300 flex items-center">
              {c.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-px overflow-hidden rounded-3xl border border-[#C9A84C]/30 bg-[#C9A84C]/20 sm:grid-cols-3 shadow-2xl shadow-[#C9A84C]/10">
          {c.stats.map((s) => (
            <div key={s.l} className="bg-gradient-to-br from-[#FBF5E6] to-[#F5E6D3] px-8 py-12 text-center hover:from-[#FFF8E7] hover:to-[#FBF5E6] transition-all duration-300">
              <div className="text-4xl sm:text-5xl font-black text-[#8B6914]">{s.v}</div>
              <div className="mt-3 text-sm font-semibold text-[#6B6355]">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Events Bar */}
        <div className="mt-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black">الفعاليات الحالية</h2>
              <p className="text-white/60 text-sm mt-1">اكتشف فرص التطوع المتاحة الآن</p>
            </div>
            <Link href="/events" className="group flex items-center gap-2 text-sm font-bold text-[#C9A84C] hover:text-[#E8C97A] transition-colors">
              عرض الكل
              <span className="group-hover:-translate-x-1 transition-transform">←</span>
            </Link>
          </div>
          
          {events.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-8 h-52" />
              ))}
            </div>
          ) : events.data && events.data.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.data.map((event: any) => (
                <div
                  key={event.id}
                  className="group rounded-3xl border border-white/10 bg-white/5 p-8 hover:border-[#C9A84C]/40 hover:bg-white/10 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black ${
                      event.registration_status === 'open' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {event.registration_status === 'open' ? (
                        <LucideCheckCircle size={14} />
                      ) : (
                        <LucideXCircle size={14} />
                      )}
                      <span>{event.registration_status === 'open' ? 'التسجيل مفتوح' : 'التسجيل مغلق'}</span>
                    </div>
                    <span className="text-[10px] text-white/30 font-mono">#{event.id.slice(0, 4)}</span>
                  </div>
                  
                  <h3 className="text-xl font-black mb-4 line-clamp-2 group-hover:text-[#C9A84C] transition-colors">{event.title}</h3>
                  
                  <div className="space-y-3 text-sm text-white/70">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
                        <LucideCalendar size={16} className="text-[#C9A84C]" />
                      </div>
                      <span>{event.start_time ? new Date(event.start_time).toLocaleDateString('ar-SA') : 'قريباً'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
                        <LucideClock size={16} className="text-[#C9A84C]" />
                      </div>
                      <span>{event.start_time ? new Date(event.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center">
                          <LucideMapPin size={16} className="text-[#C9A84C]" />
                        </div>
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
              <div className="text-white/60 text-lg">لا توجد فعاليات حالياً</div>
              <p className="text-white/40 text-sm mt-2">تابعنا للفرص القادمة</p>
            </div>
          )}
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          {c.sections.map((s) => (
            <div
              key={s.title}
              className="group rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)] hover:bg-white/10 hover:border-[#C9A84C]/30 transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="text-sm font-extrabold text-[#EBD58F] group-hover:text-[#C9A84C] transition-colors">{s.title}</div>
              <div className="mt-4 text-sm leading-8 text-white/65 group-hover:text-white/80 transition-colors">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-20 rounded-3xl border border-[#C9A84C]/20 bg-gradient-to-br from-[#C9A84C]/10 to-transparent p-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="text-2xl font-black">جاهز تبدأ؟</div>
              <div className="mt-3 text-base text-white/70">أنشئ حسابك الجامعي وابدأ في فرص التطوع خلال دقائق.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={c.primaryCta.href} className="group h-14 px-8 rounded-2xl bg-gradient-to-r from-[#C9A84C] to-[#E8C97A] text-[#0D0C0A] font-extrabold text-base hover:shadow-2xl hover:shadow-[#C9A84C]/30 transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                {c.primaryCta.label}
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href={c.secondaryCta.href} className="h-14 px-8 rounded-2xl border-2 border-[#C9A84C]/30 bg-transparent text-white font-semibold text-base hover:bg-[#C9A84C]/10 hover:border-[#C9A84C] transition-all duration-300 flex items-center">
                {c.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
