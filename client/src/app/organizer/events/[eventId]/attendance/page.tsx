'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { LucideDownload, LucideSearch, LucideUserCheck, LucideUserX, LucideUsers, LucidePlus, LucideTrash2, LucideX } from 'lucide-react'

type ReportRow = {
  id: string
  user_id: string
  event_id: string
  check_in: string | null
  check_out: string | null
  scanned_by: string | null
  created_at: string
  user_email: string | null
  user_full_name: string | null
  user_phone?: string | null
  status?: 'registered' | 'checked_in' | 'checked_out'
}

async function fetchReport(eventId: string) {
  const { data: event, error: evError } = await supabase.from('events').select('*').eq('id', eventId).single()
  if (evError) throw evError

  const { data: regs, error: regError } = await supabase
    .from('registrations')
    .select('*, users(*)')
    .eq('event_id', eventId)
  if (regError) throw regError

  const { data: atts, error: attError } = await supabase
    .from('attendance')
    .select('*')
    .eq('event_id', eventId)
  if (attError) throw attError

  const attMap = new Map((atts || []).map(a => [a.user_id, a]))

  const rows: ReportRow[] = (regs || []).map(r => {
    const att = attMap.get(r.user_id)
    let status: ReportRow['status'] = 'registered'
    if (att?.check_out) status = 'checked_out'
    else if (att?.check_in) status = 'checked_in'

    const user: any = r.users

    return {
      id: att?.id || r.id,
      user_id: r.user_id,
      event_id: eventId,
      check_in: att?.check_in || null,
      check_out: att?.check_out || null,
      scanned_by: att?.scanned_by || null,
      created_at: r.created_at,
      user_email: user?.email || null,
      user_full_name: user?.full_name || null,
      user_phone: user?.phone || null,
      status
    }
  })

  const stats = {
    total: rows.length,
    checked_in: rows.filter(r => r.check_in).length,
    checked_out: rows.filter(r => r.check_out).length
  }

  return { event, stats, rows }
}

function toCsv(rows: ReportRow[]) {
  const header = ['#', 'البريد', 'الاسم', 'الجوال', 'الحالة', 'الدخول', 'الانصراف', 'وقت إنشاء السجل', 'user_id']
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return `"${s.replaceAll('"', '""')}"`
  }
  const fmt = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleString('ar-SA')
  }
  const ordered = [...rows].sort((a, b) => {
    const an = (a.user_full_name ?? '').trim()
    const bn = (b.user_full_name ?? '').trim()
    const nameCmp = an.localeCompare(bn, 'ar')
    if (nameCmp !== 0) return nameCmp
    const ae = (a.user_email ?? '').trim()
    const be = (b.user_email ?? '').trim()
    return ae.localeCompare(be)
  })

  const lines = [header.map(escape).join(',')]
  ordered.forEach((r, idx) => {
    lines.push(
      [
        idx + 1,
        r.user_email,
        r.user_full_name,
        r.user_phone,
        r.status,
        fmt(r.check_in),
        fmt(r.check_out),
        fmt(r.created_at),
        r.user_id
      ]
        .map(escape)
        .join(',')
    )
  })

  return `\uFEFF${lines.join('\n')}`
}

export default function OrganizerEventAttendanceReportPage() {
  const params = useParams<{ eventId: string }>()
  const eventId = params.eventId
  const qc = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'checked_in' | 'checked_out' | 'not_checked'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addUserId, setAddUserId] = useState('')

  const q = useQuery({
    queryKey: ['org-att-report', eventId],
    queryFn: () => fetchReport(eventId),
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const filteredRows = useMemo(() => {
    if (!q.data) return []
    let rows = q.data.rows

    // Filter by status
    if (filterStatus === 'checked_in') {
      rows = rows.filter(r => r.check_in && !r.check_out)
    } else if (filterStatus === 'checked_out') {
      rows = rows.filter(r => r.check_out)
    } else if (filterStatus === 'not_checked') {
      rows = rows.filter(r => !r.check_in)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase()
      rows = rows.filter(r => 
        (r.user_full_name ?? '').toLowerCase().includes(s) ||
        (r.user_email ?? '').toLowerCase().includes(s) ||
        (r.user_phone ?? '').toLowerCase().includes(s)
      )
    }

    return rows
  }, [q.data, filterStatus, searchTerm])

  const csv = useMemo(() => (q.data ? toCsv(q.data.rows) : ''), [q.data])

  // Mutation to add attendance manually
  const addAttendanceMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('يجب تسجيل الدخول')

      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (userError || !user) {
        throw new Error('المستخدم غير موجود')
      }

      // Add attendance record
      const { error: attError } = await supabase.from('attendance').insert({
        user_id: userId,
        event_id: eventId,
        check_in: new Date().toISOString(),
        scanned_by: session.user.id
      })

      if (attError) throw attError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-att-report', eventId] })
      setShowAddModal(false)
      setAddUserId('')
      alert('تم إضافة الحضور بنجاح')
    },
    onError: (error: any) => {
      alert('فشل إضافة الحضور: ' + error.message)
    }
  })

  // Mutation to remove attendance
  const removeAttendanceMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!confirm('هل أنت متأكد من إلغاء حضور هذا المتطوع؟')) {
        throw new Error('تم الإلغاء')
      }

      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-att-report', eventId] })
      alert('تم إلغاء الحضور بنجاح')
    },
    onError: (error: any) => {
      if (error.message !== 'تم الإلغاء') {
        alert('فشل إلغاء الحضور: ' + error.message)
      }
    }
  })

  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['organizer', 'admin']}>
        <AppShell title="إدارة الحضور">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={`/organizer/events/${eventId}`} className="text-sm font-bold text-zinc-600 hover:text-black">
                ← العودة للفعالية
              </Link>
            </div>

            {q.data && (
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-2 h-11 rounded-2xl bg-[#C9A84C] px-5 text-sm font-semibold text-[#0D0C0A] hover:bg-[#E8C97A] transition-all active:scale-95"
                  onClick={() => setShowAddModal(true)}
                >
                  <LucidePlus size={18} />
                  إضافة حضور يدوياً
                </button>
                <button
                  className="flex items-center gap-2 h-11 rounded-2xl bg-black px-5 text-sm font-semibold text-white hover:bg-black/90 transition-all active:scale-95"
                  onClick={async () => {
                    try {
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `attendance-${eventId}.csv`
                      document.body.appendChild(a)
                      a.click()
                      a.remove()
                      URL.revokeObjectURL(url)
                    } catch (e: any) {
                      alert('فشل تصدير الملف: ' + (e.message || 'خطأ غير معروف'))
                    }
                  }}
                >
                  <LucideDownload size={18} />
                  تصدير الكشف (CSV)
                </button>
              </div>
            )}
          </div>

          {q.isLoading ? (
            <div className="mt-8 space-y-6 animate-pulse">
              <div className="grid gap-4 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-3xl bg-zinc-100" />
                ))}
              </div>
              <div className="h-96 rounded-[2.5rem] bg-zinc-100" />
            </div>
          ) : q.isError ? (
            <div className="mt-8 rounded-[2.5rem] border border-red-100 bg-red-50 p-12 text-center">
              <div className="text-red-600 font-black text-lg">عذراً، حدث خطأ أثناء تحميل البيانات</div>
              <p className="mt-2 text-red-500/70 text-sm">يرجى التأكد من اتصالك بالإنترنت أو المحاولة لاحقاً.</p>
              <button onClick={() => q.refetch()} className="mt-6 h-11 px-8 rounded-2xl bg-red-600 text-white font-bold text-sm">إعادة المحاولة</button>
            </div>
          ) : (
            <>
              {/* Stats Section */}
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-zinc-500">
                    <LucideUsers size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider">إجمالي المسجلين</span>
                  </div>
                  <div className="mt-2 text-3xl font-black">{q.data?.stats.total ?? 0}</div>
                </div>
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-600">
                    <LucideUserCheck size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider">تم التحضير</span>
                  </div>
                  <div className="mt-2 text-3xl font-black">{q.data?.stats.checked_in ?? 0}</div>
                </div>
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-blue-600">
                    <LucideUserCheck size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider">تم الانصراف</span>
                  </div>
                  <div className="mt-2 text-3xl font-black">{q.data?.stats.checked_out ?? 0}</div>
                </div>
                <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 text-red-500">
                    <LucideUserX size={20} />
                    <span className="text-xs font-bold uppercase tracking-wider">لم يحضروا</span>
                  </div>
                  <div className="mt-2 text-3xl font-black">{(q.data?.stats.total ?? 0) - (q.data?.stats.checked_in ?? 0)}</div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
                <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="text-xl font-black tracking-tight">قائمة الحضور والتفاصيل</div>
                      <div className="mt-1 text-sm text-zinc-500">البحث والفلترة اللحظية للمتطوعين.</div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <LucideSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input 
                          type="text"
                          placeholder="بحث بالاسم أو البريد..."
                          className="h-10 w-64 rounded-xl border border-black/10 bg-white pr-9 pl-4 text-xs outline-none focus:border-black/30"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <select 
                        className="h-10 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold outline-none"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                      >
                        <option value="all">الكل</option>
                        <option value="checked_in">حضروا فقط</option>
                        <option value="checked_out">انصرفوا فقط</option>
                        <option value="not_checked">لم يحضروا</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-0 overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-black/5 bg-zinc-50/30 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <th className="px-6 py-4">المتطوع</th>
                        <th className="px-6 py-4 text-center">الحالة</th>
                        <th className="px-6 py-4 text-center">إجراءات</th>
                        <th className="px-6 py-4">الدخول</th>
                        <th className="px-6 py-4">الانصراف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center text-sm text-zinc-400 font-bold">
                            لا توجد نتائج تطابق بحثك.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((r) => (
                          <tr key={r.user_id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-black text-zinc-900">{r.user_full_name ?? '—'}</div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{r.user_email}</div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                r.status === 'checked_out' ? 'bg-blue-50 text-blue-600' :
                                r.status === 'checked_in' ? 'bg-emerald-50 text-emerald-600' :
                                'bg-zinc-100 text-zinc-400'
                              }`}>
                                {r.status === 'checked_out' ? 'انصرف' :
                                 r.status === 'checked_in' ? 'حاضر' : 'مسجل'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {r.check_in && (
                                <button
                                  onClick={() => removeAttendanceMutation.mutate(r.user_id)}
                                  className="flex items-center justify-center gap-1 h-8 px-3 rounded-xl bg-red-50 text-red-600 text-[10px] font-black hover:bg-red-100 transition-all"
                                >
                                  <LucideTrash2 size={12} />
                                  إلغاء
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                              {r.check_in ? new Date(r.check_in).toLocaleTimeString('ar-SA') : '—'}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                              {r.check_out ? new Date(r.check_out).toLocaleTimeString('ar-SA') : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Add Attendance Modal */}
          {showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60 animate-in fade-in duration-300">
              <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="absolute top-6 right-6 h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-black hover:text-white transition-all"
                >
                  <LucideX size={20} />
                </button>
                
                <div className="text-center mb-8">
                  <div className="text-lg font-black mb-1">إضافة حضور يدوياً</div>
                  <div className="text-xs text-zinc-400">أدخل معرف المستخدم (User ID) لإضافة الحضور</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-700 mb-2">معرف المستخدم (User ID)</label>
                    <input
                      type="text"
                      value={addUserId}
                      onChange={(e) => setAddUserId(e.target.value)}
                      placeholder="أدخل UUID المستخدم"
                      className="w-full h-12 rounded-xl border border-black/10 bg-zinc-50 px-4 text-sm outline-none focus:border-black/30"
                    />
                  </div>

                  <button
                    onClick={() => addAttendanceMutation.mutate(addUserId)}
                    disabled={addAttendanceMutation.isPending || !addUserId}
                    className="w-full h-12 rounded-xl bg-[#C9A84C] text-[#0D0C0A] font-black text-sm hover:bg-[#E8C97A] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addAttendanceMutation.isPending ? 'جاري الإضافة...' : 'إضافة الحضور'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </AppShell>
      </RoleGate>
    </AuthGate>
  )
}
