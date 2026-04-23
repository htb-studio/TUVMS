'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export default function RoleGate({
  allow,
  children
}: {
  allow: Array<'volunteer' | 'organizer' | 'admin'>
  children: React.ReactNode
}) {
  const q = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<{ ok: boolean; data: { role: string } }>('/api/me')
      return res.data.data
    }
  })

  if (q.isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-sm text-zinc-600">جاري التحقق من الصلاحيات…</div>
      </div>
    )
  }

  const role = (q.data?.role ?? 'volunteer') as any
  if (!allow.includes(role)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          لا تملك صلاحية الوصول إلى هذه الصفحة.
        </div>
      </div>
    )
  }

  return <>{children}</>
}
