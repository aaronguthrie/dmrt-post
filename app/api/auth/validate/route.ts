import { NextRequest, NextResponse } from 'next/server'
import { validateAuthCode } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { code, role } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    const validation = await validateAuthCode(code, role)

    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      email: validation.email,
      role: validation.role,
      submissionId: validation.submissionId,
    })
  } catch (error) {
    console.error('Error validating auth code:', error)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }
}
