'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { LucideLayoutDashboard, LucideCalendar, LucideAward, LucideUser, LucideLogOut } from 'lucide-react'

function itemClass(active: boolean) {
  return [
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
    active ? 'bg-[#C9A84C]/15 text-[#8B6914]' : 'text-zinc-600 hover:bg-black/[0.03] hover:text-black'
  ].join(' ')
}

export default function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, role, membership_status')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      return data
    }
  })

  useEffect(() => {
    if (me.data?.membership_status === 'suspended' || me.data?.membership_status === 'revoked') {
      if (pathname !== '/account-suspended') {
        router.push('/account-suspended')
      }
    }
  }, [me.data, pathname, router])

  const role = (me.data?.role ?? 'volunteer') as 'volunteer' | 'organizer' | 'admin'

  const nav = [
    { href: '/dashboard', label: 'الرئيسية', icon: LucideLayoutDashboard, show: true },
    { href: '/events', label: 'الفرص', icon: LucideCalendar, show: true },
    { href: '/dashboard/wallet', label: 'المحفظة', icon: LucideAward, show: true },
    { href: '/dashboard/card', label: 'البطاقة', icon: LucideUser, show: true },
    { href: '/organizer', label: 'المنظم', icon: LucideLayoutDashboard, show: role === 'organizer' || role === 'admin' },
    { href: '/godadmimtuvms', label: 'الأدمن', icon: LucideLayoutDashboard, show: role === 'admin' }
  ].filter((x) => x.show)

  const bottomNav = [
    { href: '/dashboard', label: 'الرئيسية', icon: LucideLayoutDashboard },
    { href: '/events', label: 'الفرص', icon: LucideCalendar },
    ...(role === 'admin' ? [{ href: '/godadmimtuvms', label: 'الأدمن', icon: LucideLayoutDashboard }] : []),
    ...(role === 'organizer' ? [{ href: '/organizer', label: 'المنظم', icon: LucideLayoutDashboard }] : []),
    ...(role === 'volunteer' ? [{ href: '/dashboard/wallet', label: 'المحفظة', icon: LucideAward }] : []),
    { href: '/dashboard/card', label: 'بروفايلي', icon: LucideUser },
  ]

  return (
    <div className="min-h-screen bg-[#FFFEF9]">
      {/* Mobile Top Header */}
      <div className="sticky top-0 z-40 bg-white/80 border-b border-black/5 px-6 py-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black tracking-widest text-[#8B6914] uppercase">TUVMS</div>
            <div className="text-lg font-black tracking-tight">{title}</div>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white text-zinc-600 hover:text-red-600"
            onClick={async () => {
              if (confirm('هل تريد تسجيل الخروج؟')) {
                await supabase.auth.signOut()
                window.location.href = '/'
              }
            }}
          >
            <LucideLogOut size={20} />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 pb-24 lg:pb-6">
        <div className="hidden lg:mb-10 lg:flex lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.3em] text-[#8B6914]">TUVMS — TAIF UNIVERSITY</div>
            <div className="mt-2 text-4xl font-black tracking-tight">{title}</div>
          </div>
          <button
            className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
          >
            خروج
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[#C9A84C] flex items-center justify-center text-white text-xl font-black">
                    {me.data?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="text-sm font-black truncate max-w-[140px]">{me.data?.full_name ?? '—'}</div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      {role === 'admin' ? 'أدمن النظام' : role === 'organizer' ? 'منظم فعاليات' : 'متطوع'}
                    </div>
                  </div>
                </div>
              </div>
              
              <nav className="p-4 space-y-1">
                {nav.map((n) => {
                  const Icon = n.icon
                  const active = pathname === n.href
                  return (
                    <Link key={n.href} href={n.href} className={itemClass(active)}>
                      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                      {n.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="mt-4 p-6 border-t border-black/5 bg-zinc-50/50">
                <p className="text-[10px] text-zinc-400 font-bold leading-relaxed">
                  نادي التطوع - جامعة الطائف<br/>
                  الإصدار 2.0.0
                </p>
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/90 p-2 pb-safe-area-inset-bottom backdrop-blur-lg lg:hidden">
        <div className="flex items-center justify-around">
          {bottomNav.map((n) => {
            const Icon = n.icon
            const active = pathname === n.href
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-all active:scale-90 ${
                  active ? 'text-[#8B6914]' : 'text-zinc-400'
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{n.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
