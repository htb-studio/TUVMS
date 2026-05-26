'use client'

import { LucideAlertTriangle, LucideCheckCircle, LucideInfo, LucideX } from 'lucide-react'
import { useEffect } from 'react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  type = 'warning',
  loading = false
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const typeConfig = {
    danger: {
      icon: LucideAlertTriangle,
      iconColor: 'text-red-500',
      iconBg: 'bg-red-50',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      confirmText: 'text-white'
    },
    warning: {
      icon: LucideAlertTriangle,
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      confirmBg: 'bg-amber-600 hover:bg-amber-700',
      confirmText: 'text-white'
    },
    info: {
      icon: LucideInfo,
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-50',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      confirmText: 'text-white'
    },
    success: {
      icon: LucideCheckCircle,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
      confirmBg: 'bg-emerald-600 hover:bg-emerald-700',
      confirmText: 'text-white'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-black/5">
          <div className="flex items-center gap-3">
            <div className={`h-12 w-12 rounded-2xl ${config.iconBg} flex items-center justify-center`}>
              <Icon size={24} className={config.iconColor} />
            </div>
            <h3 className="text-xl font-black text-[#0D0C0A]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="h-10 w-10 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <LucideX size={20} className="text-zinc-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-base text-zinc-600 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-8 pb-8">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-12 rounded-2xl border-2 border-zinc-200 bg-white text-zinc-700 font-bold text-base hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 h-12 rounded-2xl ${config.confirmBg} ${config.confirmText} font-bold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                جاري...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
