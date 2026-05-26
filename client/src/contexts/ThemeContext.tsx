'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { getLevelTheme, LevelTheme } from '@/lib/themes'

interface ThemeContextType {
  theme: LevelTheme
  level: number
}

const ThemeContext = createContext<ThemeContextType>({
  theme: getLevelTheme(1),
  level: 1
})

export function ThemeProvider({ children, level }: { children: ReactNode; level: number }) {
  const theme = getLevelTheme(level)

  useEffect(() => {
    // Apply CSS variables to document
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-glow', theme.glow)

    // Apply body background for level 10
    if (level === 10) {
      document.body.style.background = 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)'
    } else if (level >= 7) {
      document.body.style.background = '#0F0F0F'
    } else if (level >= 6) {
      document.body.style.background = '#1a1a1a'
    } else {
      document.body.style.background = '#FFFFFF'
    }

    // Apply body text color
    if (level >= 6) {
      document.body.style.color = '#FFFFFF'
    } else {
      document.body.style.color = '#0D0C0A'
    }

    console.log('Theme applied:', theme.name, level)
  }, [theme, level])

  return (
    <ThemeContext.Provider value={{ theme, level }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
