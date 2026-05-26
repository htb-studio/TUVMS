'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { LucideCheckCircle2, LucideXCircle, LucideShieldCheck, LucideArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'error' | 'ok' | null; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Extract tokens from URL and set session
    const setupSession = async () => {
      const hash = window.location.hash
      const accessToken = new URLSearchParams(hash.substring(1)).get('access_token')
      const refreshToken = new URLSearchParams(hash.substring(1)).get('refresh_token')

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (error) {
          console.error('Session setup error:', error)
          setIsSessionValid(false)
          return
        }
      }

      // Check if we have a valid session
      const { data: { session } } = await supabase.auth.getSession()
      setIsSessionValid(!!session)
    }
    setupSession()
  }, [])

  function validatePassword(pw: string) {
    const issues: string[] = []
    if (pw.length < 8) issues.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل')
    if (!/[a-z]/.test(pw)) issues.push('أضف حرفًا إنجليزيًا صغيرًا (a-z)')
    if (!/[A-Z]/.test(pw)) issues.push('أضف حرفًا إنجليزيًا كبيرًا (A-Z)')
    if (!/\d/.test(pw)) issues.push('أضف رقمًا (0-9)')
    if (!/[^A-Za-z0-9]/.test(pw)) issues.push('أضف رمزًا مثل !@#$')
    return issues
  }

  async function handleReset() {
    setStatus(null)
    
    if (!password || !confirmPassword) {
      setStatus({ type: 'error', msg: 'الرجاء إدخال كلمة المرور وتأكيدها' })
      return
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', msg: 'كلمة المرور وتأكيدها غير متطابقين' })
      return
    }

    const issues = validatePassword(password)
    if (issues.length > 0) {
      setStatus({ type: 'error', msg: issues.join(' | ') })
      return
    }

    setBusy(true)
    try {
      const { data: { user }, error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setStatus({ type: 'ok', msg: 'تم تحديث كلمة المرور بنجاح' })
      
      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.push('/auth')
      }, 2000)
    } catch (e: any) {
      const msg = e?.message || 'حدث خطأ غير متوقع'
      setStatus({ type: 'error', msg })
    } finally {
      setBusy(false)
    }
  }

  if (isSessionValid === null) {
    return (
      <main className="min-h-screen bg-[#0D0C0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#C9A84C] border-t-transparent rounded-full mx-auto mb-4" />
          <div className="text-sm text-white/45">جاري التحقق من الرابط...</div>
        </div>
      </main>
    )
  }

  if (isSessionValid === false) {
    return (
      <main className="min-h-screen bg-[#0D0C0A] text-white flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-red-500/25 bg-[#1A1814] p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 mx-auto mb-4">
              <LucideXCircle className="text-red-500" size={32} />
            </div>
            <div className="text-xl font-black mb-2">رابط غير صالح</div>
            <div className="text-sm text-white/45 mb-6">
              رابط إعادة تعيين كلمة المرور منتهي الصلاحية أو غير صحيح. يرجى طلب رابط جديد من خلال صفحة "نسيت كلمة المرور".
            </div>
            <button
              onClick={() => router.push('/forgot-password')}
              className="h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A]"
            >
              طلب رابط جديد
            </button>
          </div>
        </div>
      </main>
    )
  }

  const passwordStrength = validatePassword(password)
  const isStrong = passwordStrength.length === 0 && password.length >= 8

  return (
    <main className="min-h-screen bg-[#0D0C0A] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12 relative">
        <div className="w-full rounded-3xl border border-[#C9A84C]/25 bg-[#1A1814] p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-[#C9A84C]/20 flex items-center justify-center border border-[#C9A84C]/30 mx-auto mb-4">
              <LucideShieldCheck className="text-[#C9A84C]" size={32} />
            </div>
            <div className="text-2xl font-black text-[#C9A84C]">نادي التطوع</div>
            <div className="mt-2 text-[11px] tracking-[0.25em] text-white/35">TUVMS — TAIF UNIVERSITY</div>
            <div className="mt-6 text-lg font-extrabold">تعيين كلمة مرور جديدة</div>
            <div className="mt-2 text-sm text-white/45">
              يرجى تعيين كلمة مرور قوية لحماية حسابك
            </div>
          </div>

          {status && (
            <div
              className={`mt-6 rounded-2xl border p-4 text-sm ${
                status.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {status.type === 'ok' && <LucideCheckCircle2 size={16} className="inline-block ml-2" />}
              {status.msg}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-bold text-white/45 mb-2">كلمة المرور الجديدة</label>
              <input
                className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordStrength.length > 0 ? (
                    passwordStrength.map((issue, i) => (
                      <div key={i} className="text-[10px] text-red-400 flex items-center gap-1">
                        <LucideXCircle size={10} />
                        {issue}
                      </div>
                    ))
                  ) : (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <LucideCheckCircle2 size={10} />
                      كلمة المرور قوية
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-white/45 mb-2">تأكيد كلمة المرور</label>
              <input
                className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
              {confirmPassword && password !== confirmPassword && (
                <div className="mt-2 text-[10px] text-red-400 flex items-center gap-1">
                  <LucideXCircle size={10} />
                  كلمة المرور غير متطابقة
                </div>
              )}
              {confirmPassword && password === confirmPassword && (
                <div className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1">
                  <LucideCheckCircle2 size={10} />
                  متطابقة
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#C9A84C]/15 bg-white/5 p-4">
              <div className="text-xs font-bold text-white/60 mb-3">متطلبات كلمة المرور:</div>
              <div className="space-y-2">
                <div className={`text-[10px] flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  8 أحرف على الأقل
                </div>
                <div className={`text-[10px] flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  حرف صغير (a-z)
                </div>
                <div className={`text-[10px] flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  حرف كبير (A-Z)
                </div>
                <div className={`text-[10px] flex items-center gap-2 ${/\d/.test(password) ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${/\d/.test(password) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  رقم (0-9)
                </div>
                <div className={`text-[10px] flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-400' : 'text-white/30'}`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  رمز خاص (!@#$)
                </div>
              </div>
            </div>

            <button
              className="h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={busy || !isStrong || password !== confirmPassword}
              onClick={handleReset}
            >
              {busy ? 'جاري التحديث…' : 'تحديث كلمة المرور'}
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-white/45">
            <button
              onClick={() => router.push('/auth')}
              className="text-[#C9A84C] font-bold hover:text-[#E8C97A] flex items-center justify-center gap-2"
            >
              <LucideArrowRight size={16} className="rotate-180" />
              العودة لتسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
