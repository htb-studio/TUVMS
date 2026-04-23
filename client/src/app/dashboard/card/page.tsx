'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

export default function DigitalCardPage() {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front')
  const [qrOpen, setQrOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{
        ok: boolean
        data: {
          full_name: string | null
          email?: string | null
          role: string
          gender: 'male' | 'female' | null
          university_id: string | null
          national_id: string | null
          birth_date: string | null
          phone: string | null
          college: string | null
          department: string | null
          academic_level: string | null
          skills: any
          membership_status?: 'active' | 'suspended' | 'revoked' | null
        }
      }>('/api/me')
      return res.data.data
    }
  })

  const membershipStatus = (me.data?.membership_status ?? 'active') as 'active' | 'suspended' | 'revoked'
  const statusUi = useMemo(() => {
    if (membershipStatus === 'revoked') {
      return {
        label: 'ملغي',
        border: 'border-red-500/40',
        stripe: 'bg-red-500',
        badge: 'bg-red-50 text-red-700 border-red-200'
      }
    }
    if (membershipStatus === 'suspended') {
      return {
        label: 'موقوف مؤقتًا',
        border: 'border-amber-500/40',
        stripe: 'bg-amber-500',
        badge: 'bg-amber-50 text-amber-900 border-amber-200'
      }
    }
    return {
      label: 'نشط',
      border: 'border-emerald-500/40',
      stripe: 'bg-emerald-500',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    }
  }, [membershipStatus])

  const verifyPayload = useMemo(() => {
    return {
      v: 1,
      university_id: me.data?.university_id ?? null,
      full_name: me.data?.full_name ?? null,
      status: membershipStatus
    }
  }, [me.data?.full_name, me.data?.university_id, membershipStatus])

  const verifyPayloadString = useMemo(() => JSON.stringify(verifyPayload), [verifyPayload])

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <AppShell title="البطاقة الرقمية">
        <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.35)]">
          <div className="border-b border-black/5 bg-zinc-50/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black">البطاقة الرقمية</div>
                <div className="mt-2 text-sm text-zinc-600">بطاقتك الرسمية للتوثيق والتحقق.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03]"
                >
                  رجوع
                </Link>
                <button
                  type="button"
                  onClick={() => setCardSide((s) => (s === 'front' ? 'back' : 'front'))}
                  disabled={me.isLoading || me.isError}
                  className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {cardSide === 'front' ? 'عرض القفى' : 'عرض الوجه'}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {me.isLoading ? (
              <div className="mb-6 overflow-hidden rounded-3xl border border-black/10 bg-white p-6">
                <div className="animate-pulse">
                  <div className="h-4 w-40 rounded bg-zinc-200" />
                  <div className="mt-3 h-3 w-64 rounded bg-zinc-200" />
                  <div className="mt-6 h-[260px] rounded-3xl bg-zinc-100" />
                </div>
              </div>
            ) : me.isError ? (
              <div className="mb-6 rounded-3xl border border-red-200 bg-red-50 p-6">
                <div className="text-sm font-extrabold text-red-800">تعذر تحميل بيانات البطاقة</div>
                <div className="mt-2 text-sm text-red-700">حاول تحديث الصفحة أو تسجيل الخروج ثم الدخول مرة أخرى.</div>
              </div>
            ) : null}

            <div className={`relative overflow-hidden rounded-3xl border bg-[#0D0C0A] text-white shadow-[0_18px_50px_-40px_rgba(0,0,0,0.55)] ${statusUi.border}`}>
              <div className={`absolute inset-y-0 right-0 w-3 ${statusUi.stripe}`} />

              {cardSide === 'front' ? (
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-xs font-bold tracking-[0.3em] text-[#C9A84C]">TUVMS</div>
                    <div className={`inline-flex rounded-2xl border px-3 py-1 text-xs font-semibold ${statusUi.badge}`}>{statusUi.label}</div>
                  </div>

                  <div className="mt-6 text-2xl font-black">نادي التطوع</div>
                  <div className="mt-1 text-sm text-white/60">جامعة الطائف</div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="text-xs text-white/50">الاسم</div>
                    <div className="mt-1 text-sm font-extrabold">{me.data?.full_name ?? '—'}</div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-white/50">الرقم الجامعي</div>
                        <div className="mt-1 text-sm font-extrabold">{me.data?.university_id ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">الكلية</div>
                        <div className="mt-1 text-sm font-extrabold">{me.data?.college ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold tracking-[0.3em] text-[#C9A84C]">VERIFY</div>
                      <div className="mt-2 text-sm font-extrabold">تحقق من البطاقة</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(verifyPayloadString)
                            setCopied(true)
                            window.setTimeout(() => setCopied(false), 1200)
                          } catch {
                            setCopied(false)
                          }
                        }}
                        className="h-10 rounded-2xl border border-white/10 bg-white/5 px-4 text-xs font-semibold hover:bg-white/10"
                      >
                        {copied ? 'تم النسخ' : 'نسخ البيانات'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrOpen(true)}
                        className="rounded-3xl border border-white/10 bg-white p-3 hover:bg-white/95"
                        aria-label="تكبير QR"
                      >
                        <QRCodeSVG value={verifyPayloadString} size={96} bgColor="#ffffff" fgColor="#0D0C0A" level="M" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-white/50">القسم</div>
                        <div className="mt-1 text-sm font-extrabold">{me.data?.department ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-white/50">المستوى</div>
                        <div className="mt-1 text-sm font-extrabold">{me.data?.academic_level ?? '—'}</div>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-white/55">امسح الـ QR للتحقق من حالة العضوية وبيانات المتطوع.</div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-xs font-bold text-zinc-500">الجنس</div>
                <div className="mt-2 text-sm font-extrabold">{me.data?.gender === 'male' ? 'ذكر' : me.data?.gender === 'female' ? 'أنثى' : '—'}</div>
              </div>
              <div className="rounded-3xl border border-black/10 bg-white p-4">
                <div className="text-xs font-bold text-zinc-500">رقم الجوال</div>
                <div className="mt-2 text-sm font-extrabold">{me.data?.phone ?? '—'}</div>
              </div>
            </div>
          </div>
        </div>

        {qrOpen ? (
          <div className="fixed inset-0 z-50">
            <button type="button" className="absolute inset-0 bg-black/50" onClick={() => setQrOpen(false)} aria-label="إغلاق" />
            <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_30px_90px_-50px_rgba(0,0,0,0.55)]">
              <div className="border-b border-black/5 bg-zinc-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold">QR التحقق</div>
                    <div className="mt-1 text-xs text-zinc-600">استخدمه للتحقق من البطاقة.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQrOpen(false)}
                    className="h-10 rounded-2xl border border-black/10 bg-white px-4 text-sm font-semibold hover:bg-black/[0.03]"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-center">
                  <div className="rounded-3xl border border-black/10 bg-white p-4">
                    <QRCodeSVG value={verifyPayloadString} size={280} bgColor="#ffffff" fgColor="#0D0C0A" level="M" />
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(verifyPayloadString)
                        setCopied(true)
                        window.setTimeout(() => setCopied(false), 1200)
                      } catch {
                        setCopied(false)
                      }
                    }}
                    className="h-11 rounded-2xl border border-black/10 bg-white px-5 text-sm font-semibold hover:bg-black/[0.03]"
                  >
                    {copied ? 'تم النسخ' : 'نسخ بيانات QR'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </AppShell>
    </AuthGate>
  )
}
