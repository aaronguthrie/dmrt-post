// Session management for authentication
import { cookies } from 'next/headers'
import { Role } from '@prisma/client'
import { SignJWT, jwtVerify } from 'jose'

export interface Session {
  email: string
  role: Role
  submissionId?: string
}

const SESSION_COOKIE_NAME = 'dmrt_session'
const SESSION_MAX_AGE = 24 * 60 * 60 // 24 hours in seconds

// Get session secret from environment variable
function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required')
  }
  return new TextEncoder().encode(secret)
}

/**
 * Creates a session after successful authentication
 * Uses JWT (JSON Web Token) with HMAC-SHA256 signing for security
 */
export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies()
  const secret = getSessionSecret()
  
  // Create signed JWT token
  const jwt = await new SignJWT({
    email: session.email,
    role: session.role,
    submissionId: session.submissionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)
  
  cookieStore.set(SESSION_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Gets the current session from cookies
 * Verifies JWT signature to prevent tampering
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) {
    return null
  }
  
  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret)
    
    return {
      email: payload.email as string,
      role: payload.role as Role,
      submissionId: payload.submissionId as string | undefined,
    }
  } catch (error) {
    // Invalid token, expired, or tampered with
    return null
  }
}

/**
 * Destroys the current session
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

/**
 * Checks if user has required role
 */
export function hasRole(session: Session | null, requiredRole: Role): boolean {
  if (!session) return false
  
  // Role hierarchy: leader > pro > team_member
  const roleHierarchy: Record<Role, number> = {
    team_member: 1,
    pro: 2,
    leader: 3,
  }
  
  return roleHierarchy[session.role] >= roleHierarchy[requiredRole]
}

