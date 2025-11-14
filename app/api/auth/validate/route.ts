import { NextRequest, NextResponse } from 'next/server'
import { validateAuthCode } from '@/lib/auth'
import { createSession } from '@/lib/session'
import { rateLimitByIP } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP (prevent brute force)
    const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
    const ipRateLimit = await rateLimitByIP(ip, 10, 15 * 60 * 1000) // 10 requests per 15 minutes (more lenient for validation)
    
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

    const { code, role } = await request.json()

    if (!code) {
      return NextResponse.json({ error: 'Code required' }, { status: 400 })
    }

    const validation = await validateAuthCode(code, role)

    if (!validation.valid) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    // Create session after successful validation
    await createSession({
      email: validation.email!,
      role: validation.role!,
      submissionId: validation.submissionId,
    })

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
