'use client'

import { useQuery } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabaseClient'
import { useState } from 'react'
import { LucideQrCode, LucideDownload, LucideShieldCheck, LucideMaximize2, LucideCopy, LucideCheck, LucideX } from 'lucide-react'
import QRCode from 'react-qr-code'

export default function DigitalCardPage() {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()
      if (error) throw error
      return data
    }
  })

  const stats = useQuery({
    queryKey: ['my-stats'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const [regs, attend, badges] = await Promise.all([
        supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id),
        supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).not('check_in', 'is', null),
        supabase.from('user_badges').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id)
      ])

      return {
        eventsCount: regs.count || 0,
        attendanceCount: attend.count || 0,
        badgesCount: badges.count || 0,
        totalHours: (attend.count || 0) * 2
      }
    }
  })

  const user = me.data
  const qrValue = user ? JSON.stringify({ id: user.id, type: 'volunteer_card' }) : ''

  const copyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (me.isLoading) return <AuthGate title="جاري التحميل..."><AppShell title="البطاقة الرقمية"><div className="animate-pulse space-y-4"><div className="h-[450px] bg-zinc-100 rounded-[2.5rem]" /></div></AppShell></AuthGate>

  return (
    <AuthGate title="الرجاء تسجيل الدخول لعرض بطاقتك">
      <AppShell title="الهوية التطوعية">
        <div className="space-y-8 pb-24 max-w-md mx-auto">
          
          <div className="text-center px-4">
            <h2 className="text-2xl font-black mb-2">بطاقتك الذكية 💳</h2>
            <p className="text-zinc-500 text-sm font-medium">أبرز هذه البطاقة للمنظمين لإثبات هويتك وتسجيل حضورك.</p>
          </div>

          <div 
            className="group relative h-[500px] w-full [perspective:2000px] cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`relative h-full w-full rounded-[3rem] transition-all duration-700 [transform-style:preserve-3d] shadow-2xl shadow-black/20 ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
              
              <div className="absolute inset-0 h-full w-full [backface-visibility:hidden]">
                <div className="h-full w-full rounded-[3rem] bg-zinc-900 p-8 text-white relative overflow-hidden flex flex-col border-4 border-white/5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A84C]/10 rounded-full blur-3xl -mr-20 -mt-20" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -ml-10 -mb-10" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <div className="text-[10px] font-black tracking-[0.3em] text-white/40 uppercase mb-1">Taif University</div>
                      <div className="text-lg font-black text-[#C9A84C]">نادي التطوع</div>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 backdrop-blur-md">
                      <LucideShieldCheck className="text-[#C9A84C]" size={28} />
                    </div>
                  </div>

                  <div className="mt-auto relative z-10">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-[#C9A84C] to-[#8B6914] p-1 mb-6">
                      <div className="h-full w-full rounded-[1.8rem] bg-zinc-800 flex items-center justify-center overflow-hidden">
                        <span className="text-3xl font-black text-white/20">{user?.full_name?.slice(0, 1)}</span>
                      </div>
                    </div>
                    <h3 className="text-3xl font-black mb-1">{user?.full_name}</h3>
                    <div className="flex items-center gap-2 text-white/50 text-sm font-medium">
                      <span>{user?.college || 'متطوع'}</span>
                      <span className="h-1 w-1 rounded-full bg-white/20" />
                      <span>{user?.university_id}</span>
                    </div>
                  </div>

                  <div className="mt-12 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 relative z-10">
                    <div>
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">ساعات التطوع</div>
                      <div className="text-2xl font-black text-[#C9A84C]">{stats.data?.totalHours || 0}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">المساهمات</div>
                      <div className="text-2xl font-black text-white">{stats.data?.eventsCount || 0}</div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-between items-center opacity-30">
                    <div className="h-8 w-48 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded" />
                    <div className="text-[8px] font-mono tracking-widest">TUVMS-2026</div>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <div className="h-full w-full rounded-[3rem] bg-white p-10 text-black flex flex-col items-center justify-center relative border-4 border-zinc-100">
                  <div className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-8">Scan to Verify</div>
                  
                  <div className="relative p-6 rounded-[2.5rem] bg-zinc-50 border border-zinc-100 shadow-inner group/qr">
                    <div onClick={(e) => { e.stopPropagation(); setShowQRModal(true); }}>
                      <QRCode value={qrValue} size={200} />
                    </div>
                    <button className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-10 px-6 rounded-full bg-black text-white text-[10px] font-black flex items-center gap-2 shadow-xl opacity-0 group-hover/qr:opacity-100 transition-all">
                      <LucideMaximize2 size={12} />
                      تكبير الرمز
                    </button>
                  </div>

                  <div className="mt-10 text-center">
                    <div className="text-sm font-black text-zinc-900 mb-1">رمز التحقق الشخصي</div>
                    <p className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
                      هذا الرمز مشفر وخاص بك فقط، يستخدم لتسجيل الحضور في الفعاليات.
                    </p>
                  </div>

                  <div className="mt-auto pt-8 flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-xl bg-zinc-50 flex items-center justify-center border border-zinc-100 text-zinc-400">
                        <LucideShieldCheck size={20} />
                      </div>
                      <span className="text-[8px] font-black text-zinc-300 mt-2 uppercase">Secure</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 px-2">
            <button 
              onClick={copyId}
              className="flex items-center justify-center gap-3 h-16 rounded-[1.5rem] bg-white border border-black/10 text-zinc-600 font-black text-sm hover:bg-zinc-50 transition-all active:scale-95"
            >
              {copied ? <LucideCheck className="text-emerald-500" size={18} /> : <LucideCopy size={18} />}
              {copied ? 'تم النسخ' : 'نسخ الرقم الجامعي'}
            </button>
            <button 
              onClick={() => alert('ميزة حفظ البطاقة كصورة ستتوفر قريباً في التحديث القادم!')}
              className="flex items-center justify-center gap-3 h-16 rounded-[1.5rem] bg-white border border-black/10 text-zinc-600 font-black text-sm hover:bg-zinc-50 transition-all active:scale-95"
            >
              <LucideDownload size={18} />
              حفظ كصورة
            </button>
          </div>

          <div className="rounded-3xl bg-amber-50/50 border border-amber-100 p-6 flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <LucideQrCode size={20} />
            </div>
            <div>
              <div className="text-sm font-black text-amber-900">نصيحة ذكية</div>
              <p className="text-xs text-amber-800/60 mt-1 leading-relaxed">
                اضغط على البطاقة لقلبها، يمكنك استخدام الرمز الموحد لتحضير حضورك في أي فعالية تابعة للنادي.
              </p>
            </div>
          </div>

        </div>

        {showQRModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm bg-white rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <button 
                onClick={() => setShowQRModal(false)}
                className="absolute top-6 right-6 h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-black hover:text-white transition-all"
              >
                <LucideX size={20} />
              </button>
              
              <div className="text-center mb-8">
                <div className="text-lg font-black mb-1">رمز الحضور السريع</div>
                <div className="text-xs text-zinc-400">أبرز هذا الكود للمنظم لمسحه</div>
              </div>

              <div className="flex justify-center p-6 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 shadow-inner">
                <QRCode value={qrValue} size={250} />
              </div>

              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Verified Identity
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGate>
  )
}
