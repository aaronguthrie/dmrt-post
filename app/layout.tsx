import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { Analytics } from '@vercel/analytics/next'
import { BotIdClient } from 'botid/client'
import './globals.css'

export const metadata: Metadata = {
  title: 'DMRT Postal Service',
  description: 'DMRT Postal Service',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <head>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="bingbot" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
      </head>
      <body className="font-sans">
        <BotIdClient protect={[
          { path: '/api/auth/send-link', method: 'POST' },
          { path: '/api/auth/validate', method: 'POST' },
          { path: '/api/submissions/create', method: 'POST' },
          { path: '/api/submissions/list', method: 'GET' },
          { path: '/api/submissions/[id]', method: 'GET' },
          { path: '/api/submissions/[id]', method: 'PATCH' },
          { path: '/api/submissions/regenerate', method: 'POST' },
          { path: '/api/submissions/ready', method: 'POST' },
          { path: '/api/submissions/[id]/approve', method: 'POST' },
          { path: '/api/submissions/[id]/send-for-approval', method: 'POST' },
          { path: '/api/submissions/[id]/post', method: 'POST' },
          { path: '/api/dashboard/submissions', method: 'GET' },
          { path: '/api/dashboard/export', method: 'GET' },
        ]} />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
