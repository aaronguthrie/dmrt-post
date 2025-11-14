import { NextRequest, NextResponse } from 'next/server'
import { createAuthCode, validateEmailForRole } from '@/lib/auth'
import { sendMagicLink } from '@/lib/resend'
import { Role } from '@prisma/client'
import { rateLimitByIP, rateLimitByIdentifier } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 5, 15 * 60 * 1000) // 5 requests per 15 minutes
    
    if (!ipRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((ipRateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': ipRateLimit.limit.toString(),
            'X-RateLimit-Remaining': ipRateLimit.remaining.toString(),
            'X-RateLimit-Reset': ipRateLimit.reset.toString(),
            'Retry-After': Math.ceil((ipRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }
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

    // Rate limiting by email (prevent email enumeration spam)
    const emailRateLimit = await rateLimitByIdentifier(email.toLowerCase(), 3, 60 * 60 * 1000) // 3 requests per hour per email
    
    if (!emailRateLimit.success) {
      return NextResponse.json(
        { 
          error: 'Too many requests for this email. Please try again later.',
          code: 'EMAIL_RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((emailRateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': emailRateLimit.limit.toString(),
            'X-RateLimit-Remaining': emailRateLimit.remaining.toString(),
            'X-RateLimit-Reset': emailRateLimit.reset.toString(),
            'Retry-After': Math.ceil((emailRateLimit.reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    const isValid = validateEmailForRole(email, validRole)
    // Only log non-sensitive info in development
    if (process.env.NODE_ENV === 'development') {
    console.log('Email validation result:', { email, role: validRole, isValid })
    }
    
    if (!isValid) {
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

    // Send magic link
    try {
      await sendMagicLink(email, validRole, code)
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
    
    // Log error details (sanitized - no sensitive env vars)
    if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: errorMessage,
      stack: error?.stack,
      name: error?.name,
    })
    } else {
      console.error('Error sending auth link:', errorMessage)
    }
    
    return NextResponse.json({ 
      error: 'Failed to send auth link',
      code: 'UNEXPECTED_ERROR',
      details: errorMessage
    }, { status: 500 })
  }
}
