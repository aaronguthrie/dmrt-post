import { NextRequest, NextResponse } from 'next/server'
import { createAuthCode, validateEmailForRole } from '@/lib/auth'
import { sendMagicLink, getBaseUrlFromRequest } from '@/lib/resend'
import { Role } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables first
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set')
      return NextResponse.json({ 
        error: 'Server configuration error: RESEND_API_KEY is missing',
        code: 'MISSING_RESEND_API_KEY'
      }, { status: 500 })
    }

    if (!process.env.RESEND_FROM_EMAIL) {
      console.error('RESEND_FROM_EMAIL is not set')
      return NextResponse.json({ 
        error: 'Server configuration error: RESEND_FROM_EMAIL is missing',
        code: 'MISSING_RESEND_FROM_EMAIL'
      }, { status: 500 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json({ 
        error: 'Invalid request body',
        code: 'INVALID_JSON'
      }, { status: 400 })
    }

    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email and role required',
        code: 'MISSING_FIELDS'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      }, { status: 400 })
    }

    const validRole = role as Role
    if (!['team_member', 'pro', 'leader'].includes(validRole)) {
      return NextResponse.json({ 
        error: 'Invalid role',
        code: 'INVALID_ROLE'
      }, { status: 400 })
    }

    if (!validateEmailForRole(email, validRole)) {
      return NextResponse.json({ 
        error: 'Email not authorised. If you think this is wrong reach out to Public Relations Officer.',
        code: 'UNAUTHORIZED_EMAIL'
      }, { status: 403 })
    }

    // Create auth code
    let code: string
    try {
      code = await createAuthCode(email, validRole)
    } catch (dbError: any) {
      console.error('Database error creating auth code:', dbError)
      return NextResponse.json({ 
        error: 'Failed to create authentication code',
        code: 'DATABASE_ERROR',
        details: dbError?.message || 'Unknown database error'
      }, { status: 500 })
    }

    // Get base URL from request (to use custom domain if available)
    const baseUrl = getBaseUrlFromRequest(request)

    // Send magic link
    try {
      await sendMagicLink(email, validRole, code, undefined, baseUrl)
    } catch (emailError: any) {
      console.error('Email sending error:', emailError)
      return NextResponse.json({ 
        error: 'Failed to send email',
        code: 'EMAIL_ERROR',
        details: emailError?.message || 'Unknown email error'
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Unexpected error sending auth link:', error)
    const errorMessage = error?.message || 'Failed to send auth link'
    
    // Log comprehensive error details
    console.error('Error details:', {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
      hasResendApiKey: !!process.env.RESEND_API_KEY,
      hasResendFromEmail: !!process.env.RESEND_FROM_EMAIL,
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL || 'not set',
    })
    
    return NextResponse.json({ 
      error: 'Failed to send auth link',
      code: 'UNEXPECTED_ERROR',
      details: errorMessage
    }, { status: 500 })
  }
}
