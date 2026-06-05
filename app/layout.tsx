import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Fahrenheit One — Pre-Opening Dashboard',
  description: 'Sales & Market Intelligence Platform — Fahrenheit One @ Hakoah White City',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
