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
    <main className="min-h-screen bg-[#0D0C0A] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#C9A84C]/15 blur-3xl" />
        <div className="absolute top-10 right-10 h-72 w-72 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div className="text-xs font-bold tracking-[0.3em] text-[#C9A84C]">{c.eyebrow}</div>
          <h1 className="mt-6 text-4xl sm:text-6xl font-black leading-[1.12]">
            {c.title.before}
            <span className="text-[#C9A84C]">{c.title.highlight}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm sm:text-base text-white/60 leading-8">
            {c.subtitle}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href={c.primaryCta.href} className="h-12 rounded-2xl bg-[#C9A84C] px-6 text-sm font-extrabold text-[#0D0C0A] hover:bg-[#E8C97A] flex items-center">
              {c.primaryCta.label}
            </Link>
            <Link href={c.secondaryCta.href} className="h-12 rounded-2xl border border-[#C9A84C]/30 bg-transparent px-6 text-sm font-semibold text-white/70 hover:text-[#C9A84C] hover:border-[#C9A84C] flex items-center">
              {c.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[#C9A84C]/20 bg-[#C9A84C]/20 sm:grid-cols-3">
          {c.stats.map((s) => (
            <div key={s.l} className="bg-[#FBF5E6] px-8 py-10 text-center">
              <div className="text-3xl font-black text-[#8B6914]">{s.v}</div>
              <div className="mt-2 text-sm font-semibold text-[#6B6355]">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Events Bar */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black">الفعاليات الحالية</h2>
            <Link href="/events" className="text-sm font-bold text-[#C9A84C] hover:text-[#E8C97A]">
              عرض الكل ←
            </Link>
          </div>
          
          {events.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-6 h-40" />
              ))}
            </div>
          ) : events.data && events.data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.data.map((event: any) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-[#C9A84C]/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black ${
                      event.registration_status === 'open' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {event.registration_status === 'open' ? (
                        <LucideCheckCircle size={12} />
                      ) : (
                        <LucideXCircle size={12} />
                      )}
                      <span>{event.registration_status === 'open' ? 'التسجيل مفتوح' : 'التسجيل مغلق'}</span>
                    </div>
                    <span className="text-[10px] text-white/40">#{event.id.slice(0, 4)}</span>
                  </div>
                  
                  <h3 className="text-lg font-black mb-3 line-clamp-2">{event.title}</h3>
                  
                  <div className="space-y-2 text-xs text-white/60">
                    <div className="flex items-center gap-2">
                      <LucideCalendar size={14} className="text-[#C9A84C]" />
                      <span>{event.start_time ? new Date(event.start_time).toLocaleDateString('ar-SA') : 'قريباً'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LucideClock size={14} className="text-[#C9A84C]" />
                      <span>{event.start_time ? new Date(event.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <LucideMapPin size={14} className="text-[#C9A84C]" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <div className="text-white/60">لا توجد فعاليات حالياً</div>
            </div>
          )}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {c.sections.map((s) => (
            <div
              key={s.title}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]"
            >
              <div className="text-sm font-extrabold text-[#EBD58F]">{s.title}</div>
              <div className="mt-3 text-sm leading-8 text-white/65">{s.body}</div>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xl font-black">جاهز تبدأ؟</div>
              <div className="mt-2 text-sm text-white/60">أنشئ حسابك الجامعي وابدأ في فرص التطوع خلال دقائق.</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={c.primaryCta.href} className="h-12 rounded-2xl bg-[#C9A84C] px-6 text-sm font-extrabold text-[#0D0C0A] hover:bg-[#E8C97A] flex items-center">
                {c.primaryCta.label}
              </Link>
              <Link href={c.secondaryCta.href} className="h-12 rounded-2xl border border-[#C9A84C]/30 bg-transparent px-6 text-sm font-semibold text-white/70 hover:text-[#C9A84C] hover:border-[#C9A84C] flex items-center">
                {c.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
