'use client'

import { LucideX } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
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

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-[2rem] shadow-2xl shadow-black/20 overflow-hidden animate-in fade-in zoom-in duration-200`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-gradient-to-r from-[#0D0C0A] to-[#1A1814]">
            <h3 className="text-xl font-black text-white">{title}</h3>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <LucideX size={20} className="text-white" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
