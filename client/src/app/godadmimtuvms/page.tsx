'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '@/components/AppShell'
import AuthGate from '@/components/AuthGate'
import RoleGate from '@/components/RoleGate'
import { api } from '@/lib/api'
import Link from 'next/link'
import { useState } from 'react'
import { LucideAward, LucideCalendar, LucidePlus, LucideTrash2, LucideUsers, LucideSettings, LucideSearch, LucideEye, LucideFileCheck, LucideDownload, LucidePieChart } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Pie, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

type AdminUser = {
  id: string
  email: string | null
  full_name: string | null
  role: 'volunteer' | 'organizer' | 'admin'
  created_at: string
}

type AdminEvent = {
  id: string
  title: string
  created_at: string
  date: string | null
  start_time: string | null
  end_time: string | null
  admin_tag?: string | null
  certificate_text?: string | null
}

type Badge = {
  id: string
  name: string
  icon: string | null
  description: string | null
  created_at: string
}

async function adminListUsers() {
  const res = await api.get<{ ok: boolean; data: AdminUser[] }>('/api/admin/users')
  return res.data.data
}

async function adminSetRole(userId: string, role: AdminUser['role']) {
  const res = await api.post<{ ok: boolean; data: any }>(`/api/admin/users/${userId}/role`, { role })
  return res.data.data
}

async function adminListEvents() {
  const res = await api.get<{ ok: boolean; data: AdminEvent[] }>('/api/admin/events')
  return res.data.data
}

export default function GodAdminPage() {
  return (
    <AuthGate title="الرجاء تسجيل الدخول">
      <RoleGate allow={['admin']}>
        <AdminBody />
      </RoleGate>
    </AuthGate>
  )
}

function AdminBody() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<'users' | 'events' | 'badges' | 'stats'>('stats')
  const [searchQuery, setSearchQuery] = useState('')
  
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: any }>('/api/admin/stats')
      return res.data.data
    },
    enabled: activeTab === 'stats'
  })

  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminListUsers,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const events = useQuery({
    queryKey: ['admin-events'],
    queryFn: adminListEvents,
    refetchOnWindowFocus: true,
    refetchInterval: 5000
  })

  const setRole = useMutation({
    mutationFn: async (vars: { userId: string; role: AdminUser['role'] }) => adminSetRole(vars.userId, vars.role),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] })
    }
  })

  const badges = useQuery({
    queryKey: ['admin-badges'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: Badge[] }>('/api/admin/badges')
      return res.data.data
    },
    enabled: activeTab === 'badges'
  })

  const createBadge = useMutation({
    mutationFn: async (badge: Partial<Badge>) => {
      const res = await api.post('/api/admin/badges', badge)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-badges'] })
      alert('تم إنشاء الوسام بنجاح!')
    }
  })

  const deleteBadge = useMutation({
    mutationFn: async (badgeId: string) => {
      const res = await api.delete(`/api/admin/badges/${badgeId}`)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-badges'] })
    }
  })

  return (
    <AppShell title="لوحة الأدمن">
      <div className="space-y-6 pb-20">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 h-12 px-6 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'users' ? 'bg-black text-white shadow-lg' : 'bg-white border border-black/10 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <LucideUsers size={18} /> إدارة المستخدمين
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 h-12 px-6 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'events' ? 'bg-black text-white shadow-lg' : 'bg-white border border-black/10 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <LucideCalendar size={18} /> إدارة الفعاليات
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`flex items-center gap-2 h-12 px-6 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'badges' ? 'bg-black text-white shadow-lg' : 'bg-white border border-black/10 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <LucideAward size={18} /> نظام الأوسمة
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 h-12 px-6 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'stats' ? 'bg-black text-white shadow-lg' : 'bg-white border border-black/10 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            <LucidePieChart size={18} /> الإحصائيات
          </button>
        </div>

        {activeTab === 'stats' && stats.data && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="إجمالي المتطوعين" value={stats.data.total_volunteers} icon={<LucideUsers className="text-blue-500" />} />
              <StatCard title="الفعاليات" value={stats.data.total_events} icon={<LucideCalendar className="text-emerald-500" />} />
              <StatCard title="الأوسمة الممنوحة" value={stats.data.total_badges} icon={<LucideAward className="text-amber-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gender Distribution */}
              <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-sm">
                <h3 className="text-lg font-black mb-6">توزيع المتطوعين حسب الجنس</h3>
                <div className="h-64 flex justify-center">
                  <Pie 
                    data={{
                      labels: ['ذكور', 'إناث'],
                      datasets: [{
                        data: [stats.data.gender_stats.male, stats.data.gender_stats.female],
                        backgroundColor: ['#3b82f6', '#ec4899'],
                        borderWidth: 0,
                      }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>

              {/* Excel Export Card */}
              <div className="rounded-[2.5rem] border border-black/10 bg-white p-8 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="h-16 w-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <LucideDownload size={32} />
                </div>
                <h3 className="text-xl font-black mb-2">تصدير بيانات المتطوعين</h3>
                <p className="text-sm text-zinc-500 mb-6 max-w-xs">يمكنك تحميل قائمة كاملة ببيانات المتطوعين المسجلين في النظام بصيغة Excel.</p>
                <button
                  onClick={async () => {
                    try {
                      const response = await api.get('/api/admin/export/users', { responseType: 'blob' })
                      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'volunteers.xlsx'
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } catch (e: any) {
                      alert('فشل التصدير: ' + (e.response?.data?.error || e.message))
                    }
                  }}
                  className="h-12 px-8 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <LucideFileCheck size={18} /> تحميل ملف Excel
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="relative">
              <LucideSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="ابحث عن مستخدم بالاسم أو البريد الإلكتروني..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-2xl border border-black/10 bg-white pr-12 text-sm font-bold outline-none focus:border-black/30 shadow-sm transition-all"
              />
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <h2 className="text-xl font-black tracking-tight">إدارة المستخدمين</h2>
                <p className="mt-1 text-sm text-zinc-500">تحكم في الصلاحيات والأدوار للمنظمين والمتطوعين.</p>
              </div>
              
              <div className="p-6">
                {q.isLoading && <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-zinc-100" />)}</div>}
                {q.data && (
                  <div className="space-y-3">
                    {q.data
                      .filter(u => 
                        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((u) => (
                        <div key={u.id} className="flex items-center justify-between rounded-3xl border border-black/5 bg-white p-4 hover:border-black/10 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center text-sm font-black text-[#C9A84C]">
                              {u.full_name?.charAt(0) || u.email?.charAt(0)}
                            </div>
                            <div>
                              <Link href={`/godadmimtuvms/users/${u.id}`} className="text-sm font-black hover:underline decoration-[#C9A84C] underline-offset-4 flex items-center gap-2">
                                {u.full_name ?? u.email ?? '—'}
                                <LucideEye size={14} className="text-zinc-400" />
                              </Link>
                              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{u.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={u.role}
                              onChange={(e) => setRole.mutate({ userId: u.id, role: e.target.value as any })}
                              className="h-10 rounded-xl border border-black/10 bg-zinc-50 px-3 text-xs font-bold outline-none focus:border-black/30"
                              disabled={setRole.isPending}
                            >
                              <option value="volunteer">متطوع</option>
                              <option value="organizer">منظم</option>
                              <option value="admin">أدمن</option>
                            </select>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="space-y-4">
            <div className="relative">
              <LucideSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                placeholder="ابحث عن فعالية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 w-full rounded-2xl border border-black/10 bg-white pr-12 text-sm font-bold outline-none focus:border-black/30 shadow-sm transition-all"
              />
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight">إدارة الفعاليات</h2>
                  <p className="mt-1 text-sm text-zinc-500">التحكم في وسوم الأدمن ونصوص الشهادات.</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                  <LucideSettings size={20} />
                </div>
              </div>
              <div className="p-6">
                {events.isLoading && <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-zinc-100" />)}</div>}
                {events.data && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {events.data
                      .filter(ev => ev.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((ev) => (
                        <div key={ev.id} className="group flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-5 hover:border-[#C9A84C]/50 hover:shadow-lg hover:shadow-[#C9A84C]/5 transition-all duration-300">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-base font-black tracking-tight group-hover:text-[#8B6914] transition-colors">{ev.title}</div>
                              <div className="mt-1 font-mono text-[10px] text-zinc-400 uppercase tracking-tighter flex items-center gap-1">
                                {ev.id}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {ev.date && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                                    <LucideCalendar size={10} /> {new Date(ev.date).toLocaleDateString('ar-SA')}
                                  </span>
                                )}
                                {ev.admin_tag && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                    <LucideAward size={10} /> {ev.admin_tag}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex gap-2">
                            <Link
                              href={`/godadmimtuvms/events/${ev.id}`}
                              className="flex-1 h-10 rounded-2xl bg-zinc-50 border border-black/5 text-xs font-black flex items-center justify-center hover:bg-black hover:text-white transition-all gap-2"
                            >
                              <LucideSettings size={14} /> الإعدادات
                            </Link>
                            <button
                              onClick={async () => {
                                if (confirm(`هل أنت متأكد من إصدار الشهادات لجميع من حضر في فعالية: ${ev.title}؟`)) {
                                  try {
                                    const res = await api.post(`/api/admin/events/${ev.id}/issue-certificates`)
                                    alert(`تم إصدار ${res.data.count} شهادة بنجاح!`)
                                  } catch (e: any) {
                                    alert('فشل إصدار الشهادات: ' + (e.response?.data?.error || e.message))
                                  }
                                }
                              }}
                              className="px-4 h-10 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#8B6914] text-xs font-black flex items-center justify-center hover:bg-[#C9A84C] hover:text-white transition-all gap-2"
                              title="إصدار الشهادات للحضور"
                            >
                              <LucideFileCheck size={14} /> الشهادات
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <h2 className="text-xl font-black tracking-tight">إنشاء وسام جديد</h2>
                <p className="mt-1 text-sm text-zinc-500">أضف أوسمة جديدة ليتم منحها للمتميزين.</p>
              </div>
              <div className="p-6">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.currentTarget)
                    const name = formData.get('name') as string
                    const icon = formData.get('icon') as string
                    const desc = formData.get('desc') as string
                    if (!name) return alert('يرجى إدخال اسم الوسام')
                    createBadge.mutate({ name, icon, description: desc })
                    e.currentTarget.reset()
                  }}
                  className="grid gap-4"
                >
                  <div className="flex gap-4">
                    <div className="w-20">
                      <label className="text-[10px] font-black text-zinc-400 uppercase mr-2">أيقونة</label>
                      <input name="icon" defaultValue="🏆" className="h-12 w-full rounded-2xl border border-black/10 bg-zinc-50 text-center text-xl outline-none focus:border-black/30" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-zinc-400 uppercase mr-2">اسم الوسام</label>
                      <input name="name" placeholder="مثلاً: متطوع الشهر" className="h-12 w-full rounded-2xl border border-black/10 bg-zinc-50 px-4 text-sm font-bold outline-none focus:border-black/30" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase mr-2">الوصف</label>
                    <input name="desc" placeholder="وصف قصير للوسام..." className="h-12 w-full rounded-2xl border border-black/10 bg-zinc-50 px-4 text-sm font-bold outline-none focus:border-black/30" />
                  </div>
                  <button
                    type="submit"
                    disabled={createBadge.isPending}
                    className="flex items-center justify-center gap-2 h-12 w-full rounded-2xl bg-black text-white text-sm font-black hover:bg-black/90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <LucidePlus size={18} /> {createBadge.isPending ? 'جاري الإنشاء...' : 'إنشاء الوسام الآن'}
                  </button>
                </form>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/5 bg-zinc-50/70 p-6">
                <h2 className="text-xl font-black tracking-tight">الأوسمة الحالية</h2>
              </div>
              <div className="p-6">
                {badges.isLoading && <div className="h-20 w-full animate-pulse rounded-2xl bg-zinc-100" />}
                {badges.data && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {badges.data.map((b) => (
                      <div key={b.id} className="relative flex items-center gap-4 rounded-3xl border border-black/5 bg-zinc-50/50 p-4">
                        <div className="text-3xl">{b.icon || '🏆'}</div>
                        <div>
                          <div className="text-sm font-black">{b.name}</div>
                          <div className="text-[10px] text-zinc-500 font-bold">{b.description || 'لا يوجد وصف'}</div>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا الوسام؟')) deleteBadge.mutate(b.id)
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-red-500 hover:bg-red-50 transition-all shadow-sm"
                        >
                          <LucideTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm flex items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black">{value}</div>
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{title}</div>
      </div>
    </div>
  )
}
