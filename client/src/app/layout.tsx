import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'

export const metadata: Metadata = {
  title: 'TUVMS — نادي التطوع',
  description: 'منصة إدارة التطوع'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#FFFEF9] text-[#1A1814]" style={{ fontFamily: 'Cairo, ui-sans-serif, system-ui' }}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
