// Level-based theme system
// Smooth gradient from Level 1 to Level 10
// Each level progressively changes colors and styles

export interface LevelTheme {
  id: number
  name: string
  primary: string
  secondary: string
  accent: string
  background: string
  text: string
  border: string
  gradient: string
  glow: string
  badge: string
  button: {
    primary: string
    primaryHover: string
    secondary: string
    secondaryHover: string
  }
  card: {
    background: string
    border: string
    shadow: string
  }
}

export const levelThemes: Record<number, LevelTheme> = {
  1: {
    id: 1,
    name: 'مبتدئ',
    primary: '#C9A84C',
    secondary: '#D4B85C',
    accent: '#8B6914',
    background: '#FFFFFF',
    text: '#0D0C0A',
    border: '#E5E5E5',
    gradient: 'from-[#C9A84C] to-[#D4B85C]',
    glow: 'shadow-[#C9A84C]/10',
    badge: 'bg-zinc-100 text-zinc-600',
    button: {
      primary: 'bg-[#C9A84C] hover:bg-[#D4B85C]',
      primaryHover: '#D4B85C',
      secondary: 'bg-white border-zinc-200 hover:bg-zinc-50',
      secondaryHover: '#F5F5F5'
    },
    card: {
      background: 'bg-white',
      border: 'border-zinc-200',
      shadow: 'shadow-sm'
    }
  },
  2: {
    id: 2,
    name: 'مستجد',
    primary: '#D4B85C',
    secondary: '#DFC66C',
    accent: '#9B7B24',
    background: '#FFFBF5',
    text: '#0D0C0A',
    border: '#E8D48A',
    gradient: 'from-[#D4B85C] to-[#DFC66C]',
    glow: 'shadow-[#D4B85C]/15',
    badge: 'bg-amber-50 text-amber-700',
    button: {
      primary: 'bg-[#D4B85C] hover:bg-[#DFC66C]',
      primaryHover: '#DFC66C',
      secondary: 'bg-[#FFFBF5] border-[#E8D48A] hover:bg-[#FFF8E7]',
      secondaryHover: '#FFF8E7'
    },
    card: {
      background: 'bg-[#FFFBF5]',
      border: 'border-[#E8D48A]/30',
      shadow: 'shadow-md'
    }
  },
  3: {
    id: 3,
    name: 'نشط',
    primary: '#DFC66C',
    secondary: '#EAD47E',
    accent: '#AB8D34',
    background: '#FFF8E7',
    text: '#0D0C0A',
    border: '#EBDF9A',
    gradient: 'from-[#DFC66C] to-[#EAD47E]',
    glow: 'shadow-[#DFC66C]/20',
    badge: 'bg-yellow-50 text-yellow-700',
    button: {
      primary: 'bg-[#DFC66C] hover:bg-[#EAD47E]',
      primaryHover: '#EAD47E',
      secondary: 'bg-[#FFF8E7] border-[#EBDF9A] hover:bg-[#FFF0C7]',
      secondaryHover: '#FFF0C7'
    },
    card: {
      background: 'bg-[#FFF8E7]',
      border: 'border-[#EBDF9A]/40',
      shadow: 'shadow-lg'
    }
  },
  4: {
    id: 4,
    name: 'متمرس',
    primary: '#EAD47E',
    secondary: '#F5E28F',
    accent: '#BB9F44',
    background: '#FFF5D6',
    text: '#0D0C0A',
    border: '#F0E9AB',
    gradient: 'from-[#EAD47E] to-[#F5E28F]',
    glow: 'shadow-[#EAD47E]/25',
    badge: 'bg-lime-50 text-lime-700',
    button: {
      primary: 'bg-[#EAD47E] hover:bg-[#F5E28F]',
      primaryHover: '#F5E28F',
      secondary: 'bg-[#FFF5D6] border-[#F0E9AB] hover:bg-[#FFEFA8]',
      secondaryHover: '#FFEFA8'
    },
    card: {
      background: 'bg-[#FFF5D6]',
      border: 'border-[#F0E9AB]/50',
      shadow: 'shadow-xl'
    }
  },
  5: {
    id: 5,
    name: 'خبير',
    primary: '#F5E28F',
    secondary: '#C9A84C',
    accent: '#D1B154',
    background: '#FFF2C5',
    text: '#0D0C0A',
    border: '#FAF3BC',
    gradient: 'from-[#F5E28F] to-[#C9A84C]',
    glow: 'shadow-[#F5E28F]/30',
    badge: 'bg-emerald-50 text-emerald-700',
    button: {
      primary: 'bg-[#F5E28F] hover:bg-[#C9A84C]',
      primaryHover: '#C9A84C',
      secondary: 'bg-[#FFF2C5] border-[#FAF3BC] hover:bg-[#FFEB9F]',
      secondaryHover: '#FFEB9F'
    },
    card: {
      background: 'bg-[#FFF2C5]',
      border: 'border-[#FAF3BC]/60',
      shadow: 'shadow-2xl'
    }
  },
  6: {
    id: 6,
    name: 'محترف',
    primary: '#C9A84C',
    secondary: '#D4AF37',
    accent: '#8B6914',
    background: '#2a2a2a',
    text: '#FFFFFF',
    border: '#C9A84C',
    gradient: 'from-[#C9A84C] to-[#D4AF37]',
    glow: 'shadow-[#C9A84C]/40',
    badge: 'bg-[#C9A84C]/20 text-[#C9A84C]',
    button: {
      primary: 'bg-[#C9A84C] hover:bg-[#D4AF37]',
      primaryHover: '#D4AF37',
      secondary: 'bg-zinc-800 border-[#C9A84C]/30 hover:bg-zinc-700',
      secondaryHover: '#2A2A2A'
    },
    card: {
      background: 'bg-zinc-900',
      border: 'border-[#C9A84C]/40',
      shadow: 'shadow-2xl shadow-[#C9A84C]/20'
    }
  },
  7: {
    id: 7,
    name: 'متميز',
    primary: '#D4AF37',
    secondary: '#E5BE4A',
    accent: '#AA8C2C',
    background: '#1f1f1f',
    text: '#FFFFFF',
    border: '#D4AF37',
    gradient: 'from-[#D4AF37] to-[#E5BE4A]',
    glow: 'shadow-[#D4AF37]/50',
    badge: 'bg-[#D4AF37]/20 text-[#D4AF37]',
    button: {
      primary: 'bg-[#D4AF37] hover:bg-[#E5BE4A]',
      primaryHover: '#E5BE4A',
      secondary: 'bg-zinc-900 border-[#D4AF37]/40 hover:bg-zinc-800',
      secondaryHover: '#1A1A1A'
    },
    card: {
      background: 'bg-zinc-950',
      border: 'border-[#D4AF37]/50',
      shadow: 'shadow-2xl shadow-[#D4AF37]/30'
    }
  },
  8: {
    id: 8,
    name: 'بارز',
    primary: '#E5BE4A',
    secondary: '#F0C95C',
    accent: '#C9A84C',
    background: '#151515',
    text: '#FFFFFF',
    border: '#E5BE4A',
    gradient: 'from-[#E5BE4A] to-[#F0C95C]',
    glow: 'shadow-[#E5BE4A]/60',
    badge: 'bg-[#E5BE4A]/20 text-[#E5BE4A]',
    button: {
      primary: 'bg-[#E5BE4A] hover:bg-[#F0C95C]',
      primaryHover: '#F0C95C',
      secondary: 'bg-zinc-950 border-[#E5BE4A]/50 hover:bg-zinc-900',
      secondaryHover: '#0F0F0F'
    },
    card: {
      background: 'bg-black',
      border: 'border-[#E5BE4A]/60',
      shadow: 'shadow-2xl shadow-[#E5BE4A]/40'
    }
  },
  9: {
    id: 9,
    name: 'أسطوري',
    primary: '#F0C95C',
    secondary: '#FFD700',
    accent: '#D4AF37',
    background: '#0a0a0a',
    text: '#FFFFFF',
    border: '#F0C95C',
    gradient: 'from-[#F0C95C] to-[#FFD700]',
    glow: 'shadow-[#F0C95C]/70',
    badge: 'bg-[#F0C95C]/20 text-[#F0C95C]',
    button: {
      primary: 'bg-[#F0C95C] hover:bg-[#FFD700]',
      primaryHover: '#FFD700',
      secondary: 'bg-black border-[#F0C95C]/60 hover:bg-zinc-950',
      secondaryHover: '#0A0A0A'
    },
    card: {
      background: 'bg-black',
      border: 'border-[#F0C95C]/70',
      shadow: 'shadow-2xl shadow-[#F0C95C]/50'
    }
  },
  10: {
    id: 10,
    name: 'فخم',
    primary: '#FFD700',
    secondary: '#FFA500',
    accent: '#FF6B35',
    background: 'linear-gradient(135deg, #1a0a00 0%, #2d1810 50%, #1a0a00 100%)',
    text: '#757373',
    border: '#FFD700',
    gradient: 'from-[#FFD700] via-[#FFA500] to-[#FF6B35]',
    glow: 'shadow-[0_0_60px_rgba(255,215,0,0.5)]',
    badge: 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/20 text-[#FFD700]',
    button: {
      primary: 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FF6B35]',
      primaryHover: '#FFA500',
      secondary: 'bg-black/50 border-[#FFD700]/60 hover:bg-black/70',
      secondaryHover: 'rgba(0,0,0,0.7)'
    },
    card: {
      background: 'bg-gradient-to-br from-zinc-950 via-black to-zinc-950',
      border: 'border-[#FFD700]/80',
      shadow: 'shadow-2xl shadow-[#FFD700]/60'
    }
  }
}

export function getLevelTheme(level: number): LevelTheme {
  return levelThemes[Math.min(Math.max(level, 1), 10)] || levelThemes[1]
}

export function getLevelProgress(level: number): number {
  return Math.min((level / 10) * 100, 100)
}
