'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabaseClient'

function itemClass(active: boolean) {
  return [
    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
    active ? 'bg-[#C9A84C]/15 text-[#8B6914]' : 'text-zinc-600 hover:bg-black/[0.03] hover:text-black'
  ].join(' ')
}

export default function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: { full_name: string | null; email: string | null; role: string } }>(
        '/api/me'
      )
      return res.data.data
    }
  })

  const role = (me.data?.role ?? 'volunteer') as 'volunteer' | 'organizer' | 'admin'

  const nav = [
    { href: '/dashboard', label: 'لوحة التحكم', show: true },
    { href: '/events', label: 'الفرص التطوعية', show: true },
    { href: '/organizer', label: 'لوحة المنظم', show: role === 'organizer' || role === 'admin' },
    { href: '/godadmimtuvms', label: 'لوحة الأدمن', show: role === 'admin' }
  ].filter((x) => x.show)

  return (
    <div className="min-h-screen bg-[#FFFEF9]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold tracking-[0.3em] text-[#8B6914]">TUVMS — TAIF UNIVERSITY</div>
            <div className="mt-2 text-2xl font-black tracking-tight">{title}</div>
          </div>
          <button
            className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
          >
            خروج
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
            <div className="border-b border-black/5 bg-zinc-50/70 p-5">
              <div className="text-sm font-extrabold">القائمة</div>
              <div className="mt-2 text-xs text-zinc-600">تنقل سريع حسب صلاحياتك.</div>
            </div>
            <nav className="p-3">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className={itemClass(pathname === n.href)}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-black/5 bg-zinc-50/70 p-5">
              <div className="text-xs text-zinc-500">المستخدم</div>
              <div className="mt-1 text-sm font-extrabold">{me.data?.full_name ?? '—'}</div>
              <div className="mt-1 text-xs text-zinc-600">{me.data?.email ?? ''}</div>
              <div className="mt-2 inline-flex rounded-2xl border border-black/10 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                {role === 'admin' ? 'أدمن' : role === 'organizer' ? 'منظم' : 'متطوع'}
              </div>
            </div>
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
