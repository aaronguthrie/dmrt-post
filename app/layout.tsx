import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DMRT Social Media',
  description: 'Donegal Mountain Rescue Team Social Media Post Management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

