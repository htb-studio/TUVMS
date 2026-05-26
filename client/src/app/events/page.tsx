'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { LucideSearch, LucideX, LucideCalendar, LucideChevronRight, LucideClock, LucideTag, LucideUsers, LucideStar, LucideSparkles, LucideArrowRight, LucideLock, LucideLogIn, LucideCrown } from 'lucide-react'

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
  const router = useRouter()
  const [qText, setQText] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'registered'>('all')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [pendingEventId, setPendingEventId] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userLevel, setUserLevel] = useState(1)

  // Check login status and user level
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
      
      if (session) {
        const { data: profile } = await supabase.from('users').select('level').eq('id', session.user.id).single()
        setUserLevel(profile?.level || 1)
      }
    }
    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session)
      if (session) {
        supabase.from('users').select('level').eq('id', session.user.id).single().then(({ data }) => {
          setUserLevel(data?.level || 1)
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Check for pending event registration after login
  useEffect(() => {
    const checkPendingEvent = async () => {
      if (isLoggedIn) {
        const pending = localStorage.getItem('pending_event_registration')
        if (pending) {
          localStorage.removeItem('pending_event_registration')
          // Auto-register for the event
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            const { error } = await supabase.from('registrations').insert({
              user_id: session.user.id,
              event_id: pending,
              token: Math.random().toString(36)
            })
            if (!error) {
              // Redirect to event page
              router.push(`/events/${pending}`)
            }
          }
        }
      }
    }
    checkPendingEvent()
  }, [isLoggedIn, router])

  // Calculate early access hours based on level
  const getEarlyAccessHours = (level: number): number => {
    const accessMap: Record<number, number> = {
      1: 0,
      2: 1,
      3: 3,
      4: 4,
      5: 6,
      6: 8,
      7: 12,
      8: 16,
      9: 20,
      10: 24
    }
    return accessMap[level] || 0
  }

  // Check if event is open for registration based on user level
  const isEventOpenForUser = (event: any): boolean => {
    if (!event.registration_open_time) return true
    
    const openTime = new Date(event.registration_open_time)
    const now = new Date()
    const earlyAccessHours = getEarlyAccessHours(userLevel)
    const earlyAccessTime = new Date(openTime.getTime() - (earlyAccessHours * 60 * 60 * 1000))
    
    return now >= earlyAccessTime
  }

  // Get early access badge text
  const getEarlyAccessBadge = (event: any): { show: boolean; text: string; hours: number } => {
    if (!event.registration_open_time) return { show: false, text: '', hours: 0 }
    
    const openTime = new Date(event.registration_open_time)
    const now = new Date()
    const earlyAccessHours = getEarlyAccessHours(userLevel)
    const earlyAccessTime = new Date(openTime.getTime() - (earlyAccessHours * 60 * 60 * 1000))
    
    if (now < earlyAccessTime) {
      const hoursUntil = Math.ceil((earlyAccessTime.getTime() - now.getTime()) / (1000 * 60 * 60))
      return { show: true, text: `يفتح بعد ${hoursUntil} ساعة`, hours: earlyAccessHours }
    }
    
    if (earlyAccessHours > 0 && now >= earlyAccessTime && now < openTime) {
      return { show: true, text: `Early Access (${earlyAccessHours}س)`, hours: earlyAccessHours }
    }
    
    return { show: false, text: '', hours: 0 }
  }

  const events = useQuery({
    queryKey: ['events-v2'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      let query = supabase.from('events').select('*').order('created_at', { ascending: false })
      
      // Only show visible events for non-admin users
      if (session) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', session.user.id).single()
        const isAdmin = profile?.role === 'admin' || profile?.role === 'organizer'
        if (!isAdmin) {
          query = query.eq('is_visible', true)
        }
      } else {
        // Public users only see visible events
        query = query.eq('is_visible', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
    refetchInterval: 10000
  })

  const regs = useQuery({
    queryKey: ['my-registrations-v2'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return []
      const { data, error } = await supabase.from('registrations').select('event_id, created_at').eq('user_id', session.user.id)
      if (error) throw error
      return data
    },
    enabled: true // Always try to fetch, returns empty if no session
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
                const earlyAccess = getEarlyAccessBadge(e)
                const isOpen = isEventOpenForUser(e)
                
                const handleCardClick = () => {
                  if (!isLoggedIn) {
                    setPendingEventId(String(e.id))
                    localStorage.setItem('pending_event_registration', String(e.id))
                    setShowLoginModal(true)
                  } else if (isOpen) {
                    router.push(`/events/${e.id}`)
                  }
                }
                
                return (
                  <div 
                    key={e.id} 
                    onClick={handleCardClick}
                    className={`group relative flex flex-col overflow-hidden rounded-[2.5rem] border shadow-sm transition-all duration-500 ${isOpen ? 'border-black/5 bg-white hover:shadow-xl hover:border-amber-500/30 cursor-pointer' : 'border-zinc-200 bg-zinc-50 cursor-not-allowed opacity-75'}`}
                  >
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {registered ? (
                            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black bg-emerald-50 text-emerald-600">
                              <LucideStar size={12} fill="currentColor" />
                              <span>أنت مسجل</span>
                            </div>
                          ) : (
                            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${isOpen ? 'bg-amber-50 text-amber-600' : 'bg-zinc-200 text-zinc-500'}`}>
                              {isOpen ? <LucideSparkles size={12} /> : <LucideLock size={12} />}
                              <span>{isOpen ? 'فرصة متاحة' : 'مغلق مؤقتاً'}</span>
                            </div>
                          )}
                          {earlyAccess.show && (
                            <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black bg-[#C9A84C]/20 text-[#C9A84C] border border-[#C9A84C]/30">
                              <LucideCrown size={10} />
                              <span>{earlyAccess.text}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#0D0C0A] uppercase tracking-widest">#{e.id.slice(0,4)}</span>
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
                  </div>
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

        {/* Login Modal */}
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/25 bg-[#1A1814] p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center border border-[#C9A84C]/30 mx-auto mb-4">
                  <LucideLock className="text-[#C9A84C]" size={32} />
                </div>
                <div className="text-2xl font-black text-[#C9A84C] mb-2">تسجيل الدخول مطلوب</div>
                <div className="text-sm text-white/45 mb-6">
                  يجب تسجيل الدخول للتسجيل في الفعاليات
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowLoginModal(false)
                    router.push('/auth')
                  }}
                  className="h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A] flex items-center justify-center gap-2"
                >
                  <LucideLogIn size={18} />
                  تسجيل الدخول
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 text-white text-sm font-bold hover:bg-white/10"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
  )
}
