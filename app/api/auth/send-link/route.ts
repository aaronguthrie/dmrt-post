import { NextRequest, NextResponse } from 'next/server'
import { createAuthCode, validateEmailForRole } from '@/lib/auth'
import { sendMagicLink } from '@/lib/resend'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role required' }, { status: 400 })
    }

    const validRole = role as Role
    if (!validateEmailForRole(email, validRole)) {
      return NextResponse.json({ error: 'Email not authorized for this role' }, { status: 403 })
    }

    const code = await createAuthCode(email, validRole)
    await sendMagicLink(email, validRole, code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending auth link:', error)
    return NextResponse.json({ error: 'Failed to send auth link' }, { status: 500 })
  }
}
