'use client'

import { useTheme } from '@/contexts/ThemeContext'
import { ReactNode } from 'react'

interface ThemedButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export default function ThemedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  className = '',
  type = 'button'
}: ThemedButtonProps) {
  const { theme } = useTheme()

  const baseClasses = 'h-12 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50'

  const variantClasses = variant === 'primary'
    ? `${theme.button.primary} text-[#0D0C0A]`
    : `${theme.button.secondary} text-zinc-700`

  const shadowStyle = variant === 'primary'
    ? { boxShadow: `0 10px 40px -10px ${theme.primary}40` }
    : {}

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses} ${className}`}
      style={shadowStyle}
    >
      {loading ? (
        <>
          <div className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
          جاري...
        </>
      ) : (
        children
      )}
    </button>
  )
}
