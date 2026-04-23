'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [universityId, setUniversityId] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [college, setCollege] = useState('')
  const [department, setDepartment] = useState('')
  const [academicLevel, setAcademicLevel] = useState('')
  const [skillsTech, setSkillsTech] = useState<string[]>([])
  const [skillsDaily, setSkillsDaily] = useState<string[]>([])
  const [skillsAdmin, setSkillsAdmin] = useState<string[]>([])
  const [status, setStatus] = useState<{ type: 'error' | 'ok'; msg: string } | null>(null)
  const [busy, setBusy] = useState(false)

  function passwordIssues(pw: string, emailNorm: string) {
    const issues: string[] = []
    const p = pw ?? ''
    if (p.length < 10) issues.push('يجب أن تكون كلمة المرور 10 أحرف على الأقل')
    if (!/[a-z]/.test(p)) issues.push('أضف حرفًا إنجليزيًا صغيرًا (a-z)')
    if (!/[A-Z]/.test(p)) issues.push('أضف حرفًا إنجليزيًا كبيرًا (A-Z)')
    if (!/\d/.test(p)) issues.push('أضف رقمًا (0-9)')
    if (!/[^A-Za-z0-9]/.test(p)) issues.push('أضف رمزًا مثل !@#$')

    const lowered = p.toLowerCase()
    const localPart = (emailNorm.split('@')[0] ?? '').toLowerCase()
    if (localPart && lowered.includes(localPart)) issues.push('لا تجعل كلمة المرور تحتوي على جزء من بريدك')

    const common = new Set([
      '123456',
      '12345678',
      '123456789',
      'password',
      'qwerty',
      '111111',
      '000000',
      'iloveyou',
      'admin',
      'welcome'
    ])
    if (common.has(lowered.replace(/\s+/g, ''))) issues.push('كلمة المرور شائعة وضعيفة جدًا')

    return issues
  }

  async function submit() {
    setStatus(null)
    const emailNorm = email.trim().toLowerCase()
    if (!emailNorm || !password) {
      setStatus({ type: 'error', msg: 'الرجاء إدخال البريد وكلمة المرور' })
      return
    }
    if (!/@((students)\.)?tu\.edu\.sa$/i.test(emailNorm)) {
      setStatus({ type: 'error', msg: 'يجب أن ينتهي البريد بـ @tu.edu.sa أو @students.tu.edu.sa' })
      return
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailNorm, password })
        if (error) throw error

        const confirmedAt = (data.user as any)?.email_confirmed_at ?? (data.user as any)?.confirmed_at ?? null
        if (!confirmedAt) {
          await supabase.auth.signOut()
          setStatus({ type: 'error', msg: 'حسابك غير مفعّل. تحقق من بريدك الجامعي وأكمل التفعيل ثم أعد تسجيل الدخول.' })
          return
        }
        window.location.href = '/dashboard'
        return
      }

      if (confirmPassword !== password) {
        setStatus({ type: 'error', msg: 'تأكيد كلمة المرور غير مطابق' })
        return
      }

      const issues = passwordIssues(password, emailNorm)
      if (issues.length > 0) {
        setStatus({ type: 'error', msg: issues[0] })
        return
      }

      if (!fullName.trim()) {
        setStatus({ type: 'error', msg: 'الرجاء إدخال الاسم' })
        return
      }

      if (!gender) {
        setStatus({ type: 'error', msg: 'الرجاء اختيار الجنس' })
        return
      }

      if (!universityId.trim()) {
        setStatus({ type: 'error', msg: 'الرجاء إدخال الرقم الجامعي' })
        return
      }

      if (!phone.trim()) {
        setStatus({ type: 'error', msg: 'الرجاء إدخال رقم الجوال' })
        return
      }

      if (!college.trim()) {
        setStatus({ type: 'error', msg: 'الرجاء اختيار الكلية' })
        return
      }

      const { error } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined,
          data: {
            full_name: fullName,
            gender,
            university_id: universityId,
            national_id: nationalId || null,
            birth_date: birthDate || null,
            phone,
            college,
            department: department || null,
            academic_level: academicLevel || null,
            skills: {
              tech: skillsTech,
              daily: skillsDaily,
              admin: skillsAdmin
            }
          }
        }
      })
      if (error) throw error

      setStatus({ type: 'ok', msg: 'تم إنشاء الحساب. تحقق من بريدك الجامعي لتفعيل الحساب ثم سجّل الدخول.' })
      setMode('signin')
    } catch (e: any) {
      const fallback = 'حدث خطأ غير متوقع'
      const msgRaw =
        typeof e === 'string'
          ? e
          : (e?.message ?? e?.error_description ?? e?.error?.message ?? e?.msg ?? null)
      const msg =
        typeof msgRaw === 'string' && msgRaw.trim()
          ? msgRaw
          : (() => {
              try {
                const s = JSON.stringify(e)
                return s && s !== '{}' ? s : fallback
              } catch {
                return fallback
              }
            })()

      console.error('Auth error:', e)
      setStatus({ type: 'error', msg })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0D0C0A] text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C9A84C' fill-opacity='0.04'%3E%3Cpath d='M20 20h20v20H20zM0 0h20v20H0z'/%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="mx-auto flex min-h-screen max-w-lg items-center px-6 py-12 relative">
        <div className="w-full rounded-3xl border border-[#C9A84C]/25 bg-[#1A1814] p-8 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.7)]">
          <div className="text-center">
            <div className="text-2xl font-black text-[#C9A84C]">نادي التطوع</div>
            <div className="mt-2 text-[11px] tracking-[0.25em] text-white/35">TUVMS — TAIF UNIVERSITY</div>
            <div className="mt-6 text-lg font-extrabold">{mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}</div>
            <div className="mt-2 text-sm text-white/45">
              {mode === 'signin' ? 'أدخل بريدك الجامعي للمتابعة' : 'أنشئ حسابًا للانضمام للفرص التطوعية'}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 rounded-2xl border border-[#C9A84C]/15 bg-white/5 p-1">
            <button
              className={`h-10 rounded-2xl text-sm font-bold transition ${mode === 'signin' ? 'bg-[#C9A84C] text-[#0D0C0A]' : 'text-white/60 hover:text-white'}`}
              onClick={() => setMode('signin')}
              type="button"
            >
              دخول
            </button>
            <button
              className={`h-10 rounded-2xl text-sm font-bold transition ${mode === 'signup' ? 'bg-[#C9A84C] text-[#0D0C0A]' : 'text-white/60 hover:text-white'}`}
              onClick={() => setMode('signup')}
              type="button"
            >
              حساب جديد
            </button>
          </div>

          {status && (
            <div
              className={`mt-4 rounded-2xl border p-4 text-sm ${
                status.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-200'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              }`}
            >
              {status.msg}
            </div>
          )}

          <div className="mt-6">
            {mode === 'signup' && (
              <div className="mb-4 grid gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/45 mb-2">الاسم الرباعي</label>
                  <input
                    className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="حاتم طلال المطيري"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">الجنس</label>
                    <select
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-[#1A1814] px-3 text-sm outline-none focus:border-[#C9A84C]"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                    >
                      <option value="">اختر…</option>
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">تاريخ الميلاد</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      type="date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">الرقم الجامعي</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={universityId}
                      onChange={(e) => setUniversityId(e.target.value)}
                      placeholder="44000000"
                      inputMode="numeric"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">رقم الجوال</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      inputMode="tel"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">الكلية</label>
                    <select
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-[#1A1814] px-3 text-sm outline-none focus:border-[#C9A84C]"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                    >
                      <option value="">اختر…</option>
                      <option value="كلية الطب">كلية الطب</option>
                      <option value="طب الاسنانكلية">كلية طب الاسنان</option>
                      <option value="كلية الصيدلة">كلية الصيدلة</option>
                      <option value="كلية العلوم التطبيقية">كلية العلوم التطبيقية</option>
                      <option value="كلية التمريض">كلية التمريض</option>
                      <option value="كلية الاداب">كلية الاداب</option>
                      <option value="الكلية التطبيقية">الكلية التطبيقية</option>
                      <option value="كلية الشريعة والانظمة">كلية الشريعة والانظمة</option>
                      <option value="كلية الهندسة">كلية الهندسة</option>
                      <option value="كلية الحاسبات وتقنية المعلومات">كلية الحاسبات وتقنية المعلومات</option>
                      <option value="كلية العلوم">كلية العلوم</option>
                      <option value="كلية إدارة الاعمال">كلية إدارة الأعمال</option>
                      <option value="كلية التربية">كلية التربية</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">القسم</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="مثال: علوم الحاسب"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">المستوى الدراسي</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={academicLevel}
                      onChange={(e) => setAcademicLevel(e.target.value)}
                      placeholder="مثال: مستوى 5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/45 mb-2">رقم الهوية</label>
                    <input
                      className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="10xxxxxxxx"
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-[#C9A84C]/15 bg-white/5 p-4">
                  <div className="text-xs font-extrabold text-white/60">بنك المهارات</div>

                  <div className="mt-4 grid gap-4">
                    <div>
                      <div className="text-[11px] font-bold text-white/45 mb-2">مهارات تقنية</div>
                      <div className="flex flex-wrap gap-2">
                        {['برمجة', 'تصميم', 'مونتاج', 'إدارة مواقع'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSkillsTech((x) => (x.includes(s) ? x.filter((i) => i !== s) : [...x, s]))
                            }
                            className={`h-9 rounded-2xl px-4 text-xs font-bold border transition ${
                              skillsTech.includes(s)
                                ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0D0C0A]'
                                : 'border-[#C9A84C]/20 bg-transparent text-white/70 hover:border-[#C9A84C]/60'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-white/45 mb-2">مهارات يومية/ميدانية</div>
                      <div className="flex flex-wrap gap-2">
                        {['إسعافات أولية', 'تنظيم', 'تصوير فوتوغرافي'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSkillsDaily((x) => (x.includes(s) ? x.filter((i) => i !== s) : [...x, s]))
                            }
                            className={`h-9 rounded-2xl px-4 text-xs font-bold border transition ${
                              skillsDaily.includes(s)
                                ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0D0C0A]'
                                : 'border-[#C9A84C]/20 bg-transparent text-white/70 hover:border-[#C9A84C]/60'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold text-white/45 mb-2">مهارات إدارية</div>
                      <div className="flex flex-wrap gap-2">
                        {['قيادة فرق', 'كتابة تقارير', 'ترجمة', 'تقديم وإلقاء'].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() =>
                              setSkillsAdmin((x) => (x.includes(s) ? x.filter((i) => i !== s) : [...x, s]))
                            }
                            className={`h-9 rounded-2xl px-4 text-xs font-bold border transition ${
                              skillsAdmin.includes(s)
                                ? 'border-[#C9A84C] bg-[#C9A84C] text-[#0D0C0A]'
                                : 'border-[#C9A84C]/20 bg-transparent text-white/70 hover:border-[#C9A84C]/60'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <label className="block text-xs font-bold text-white/45 mb-2">البريد الجامعي</label>
            <input
              className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="s1234567@tu.edu.sa"
              type="email"
            />

            <div className="mt-4">
              <label className="block text-xs font-bold text-white/45 mb-2">كلمة المرور</label>
              <input
                className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                }}
              />
              {mode === 'signup' && (
                <div className="mt-2 text-[11px] text-white/45">
                  كلمة مرور قوية: 10 أحرف+ وتحتوي على حرف كبير وصغير ورقم ورمز.
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <div className="mt-4">
                <label className="block text-xs font-bold text-white/45 mb-2">تأكيد كلمة المرور</label>
                <input
                  className="h-11 w-full rounded-2xl border border-[#C9A84C]/20 bg-white/5 px-4 text-sm outline-none focus:border-[#C9A84C]"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  type="password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit()
                  }}
                />
              </div>
            )}

            <button
              className="mt-6 h-12 w-full rounded-2xl bg-[#C9A84C] text-[#0D0C0A] text-sm font-extrabold hover:bg-[#E8C97A] disabled:opacity-60"
              disabled={busy}
              onClick={submit}
            >
              {busy ? 'جاري المعالجة…' : mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
            </button>

            <div className="mt-6 text-center text-sm text-white/45">
              <Link href="/" className="text-[#C9A84C] font-bold hover:text-[#E8C97A]">
                رجوع للصفحة التعريفية
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
