'use client'

import { LucideCheckCircle, LucideX, LucideXCircle, LucideAlertTriangle, LucideInfo } from 'lucide-react'
import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  type?: ToastType
  message: string
  duration?: number
  onClose?: () => void
}

export default function Toast({ type = 'info', message, duration = 4000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose?.(), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeConfig = {
    success: {
      icon: LucideCheckCircle,
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-900'
    },
    error: {
      icon: LucideXCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-900'
    },
    warning: {
      icon: LucideAlertTriangle,
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900'
    },
    info: {
      icon: LucideInfo,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  if (!isVisible) return null

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-md ${config.bgColor} ${config.borderColor} border-2 rounded-2xl shadow-xl shadow-black/10 animate-in slide-in-from-right duration-300`}>
      <div className="flex items-start gap-3 p-4">
        <div className={`h-10 w-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={config.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${config.textColor} leading-relaxed`}>{message}</p>
        </div>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(() => onClose?.(), 300)
          }}
          className={`h-8 w-8 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity`}
        >
          <LucideX size={16} className={config.iconColor} />
        </button>
      </div>
    </div>
  )
}

// Hook for using toasts
export function useToast() {
  const [toasts, setToasts] = useState<Array<{ id: string; type: ToastType; message: string }>>([])

  const showToast = (type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2)
    setToasts(prev => [...prev, { id, type, message }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const success = (message: string) => showToast('success', message)
  const error = (message: string) => showToast('error', message)
  const warning = (message: string) => showToast('warning', message)
  const info = (message: string) => showToast('info', message)

  return {
    toasts,
    removeToast,
    success,
    error,
    warning,
    info
  }
}
