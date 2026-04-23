'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function AuthGate({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthed(!!data.session?.access_token)
      setReady(true)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setAuthed(!!session?.access_token)
      setReady(true)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#0D0C0A] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/20 bg-[#1A1814] p-8">
          <div className="h-5 w-32 rounded bg-white/10" />
          <div className="mt-4 h-4 w-full rounded bg-white/10" />
          <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
        </div>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-[#0D0C0A] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-[#C9A84C]/20 bg-[#1A1814] p-8">
          <div className="text-xl font-black">{title}</div>
          <div className="mt-3 text-sm text-white/50">هذه الصفحة تتطلب تسجيل دخول.</div>
          <div className="mt-8 flex gap-2">
            <Link href="/auth" className="h-11 rounded-2xl bg-[#C9A84C] px-5 text-sm font-extrabold text-[#0D0C0A] hover:bg-[#E8C97A] flex items-center">
              تسجيل الدخول
            </Link>
            <Link href="/" className="h-11 rounded-2xl border border-[#C9A84C]/20 bg-transparent px-5 text-sm font-semibold text-white/70 hover:text-[#C9A84C] flex items-center">
              الصفحة التعريفية
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
