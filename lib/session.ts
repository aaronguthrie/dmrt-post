// Session management for authentication
import { cookies } from 'next/headers'
import { Role } from '@prisma/client'

export interface Session {
  email: string
  role: Role
  submissionId?: string
}

const SESSION_COOKIE_NAME = 'dmrt_session'
const SESSION_MAX_AGE = 24 * 60 * 60 // 24 hours in seconds

/**
 * Creates a session after successful authentication
 */
export async function createSession(session: Session): Promise<void> {
  const cookieStore = await cookies()
  
  // Simple session token (in production, use JWT or signed cookies)
  const sessionData = JSON.stringify({
    email: session.email,
    role: session.role,
    submissionId: session.submissionId,
    expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
  })
  
  // Base64 encode (in production, use proper encryption)
  const sessionToken = Buffer.from(sessionData).toString('base64')
  
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

/**
 * Gets the current session from cookies
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!sessionToken) {
    return null
  }
  
  try {
    const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString())
    
    // Check expiration
    if (sessionData.expiresAt < Date.now()) {
      return null
    }
    
    return {
      email: sessionData.email,
      role: sessionData.role,
      submissionId: sessionData.submissionId,
    }
  } catch (error) {
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

